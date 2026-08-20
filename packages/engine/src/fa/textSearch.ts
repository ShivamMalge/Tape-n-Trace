/**
 * Searching text for keywords — Hopcroft 2e §2.4.
 *
 * The application that makes finite automata feel like engineering rather than
 * algebra. Two machines, and the contrast between them is the lesson:
 *
 * - **§2.4.2, the NFA.** One state per proper prefix of each keyword, plus a
 *   start state that loops on everything. Trivial to build: it *guesses* where
 *   a keyword begins. Its size is the total length of the keywords.
 * - **§2.4.3, the DFA.** One state per prefix that is *live* — a prefix of some
 *   keyword that the text could still be in the middle of. It never guesses, so
 *   it reads each character once.
 *
 * The DFA is built directly rather than by running the subset construction over
 * the NFA, which is what §2.4.3 does and why it is worth its own section: the
 * subset that matters is always "the longest keyword prefix that is a suffix of
 * what has been read", so the states can be named by that prefix.
 */

import { faTransitionId } from '../ids.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { simulateDFA } from './simulate.js'
import type { DFASnapshot } from './simulate.js'
import type { FATransition, FiniteAutomaton, StateId, Sym } from '../types.js'

/** The state for a keyword prefix. The empty prefix is the start state. */
function prefixState(prefix: string): StateId {
  return prefix === '' ? 'start' : prefix
}

export interface KeywordMachines {
  nfa: FiniteAutomaton
  dfa: FiniteAutomaton
  /** The alphabet actually used — every character appearing in a keyword. */
  alphabet: Sym[]
}

/**
 * Build both machines for a keyword set.
 *
 * `extra` widens the alphabet beyond the keywords' own characters — normally the
 * characters of the text about to be searched. That matters more than it looks:
 * a DFA that cannot read a full stop cannot be run over a sentence by
 * `simulateDFA`, and the search would need a private simulator of its own. With
 * the text's characters in the alphabet, "a character that breaks every partial
 * match" becomes an ordinary transition back towards the start rather than a
 * special case (§2.4.3).
 */
export function keywordMachines(
  keywords: readonly string[],
  extra: readonly Sym[] = [],
): Result<KeywordMachines> {
  const problems = checkKeywords(keywords)
  if (problems.length > 0) return err(problems)

  const unique = [...new Set(keywords)]
  const alphabet = [...new Set([...unique.flatMap((word) => [...word]), ...extra])].sort()

  return ok({
    nfa: keywordNFA(unique, alphabet),
    dfa: keywordDFA(unique, alphabet),
    alphabet,
  })
}

/**
 * §2.4.2 — the guessing NFA.
 *
 * The start state loops on every symbol, so the machine can begin looking for a
 * keyword at any position. From there each keyword is a straight chain.
 */
export function keywordNFA(keywords: readonly string[], alphabet: readonly Sym[]): FiniteAutomaton {
  const start = prefixState('')
  const states: StateId[] = [start]
  const transitions: FATransition[] = alphabet.map((symbol) => ({
    id: faTransitionId(start, symbol, start),
    from: start,
    read: symbol,
    to: start,
  }))
  const accepting: StateId[] = []

  keywords.forEach((word, index) => {
    // Chains are kept separate per keyword — that is what makes it an NFA and
    // what the DFA below merges.
    let from = start
    ;[...word].forEach((symbol, i) => {
      const to = `k${index}:${word.slice(0, i + 1)}`
      states.push(to)
      transitions.push({ id: faTransitionId(from, symbol, to), from, read: symbol, to })
      from = to
    })
    accepting.push(from)
  })

  return { kind: 'NFA', states, alphabet: [...alphabet], transitions, start, accepting }
}

/**
 * §2.4.3 — the DFA that recognises a set of keywords.
 *
 * One state per prefix of a keyword. After reading a character the machine is in
 * the state for the **longest keyword prefix that is a suffix of the text so
 * far**, which is exactly what the subset construction would have discovered.
 */
export function keywordDFA(keywords: readonly string[], alphabet: readonly Sym[]): FiniteAutomaton {
  const prefixes = new Set<string>([''])
  for (const word of keywords) {
    for (let i = 1; i <= word.length; i++) prefixes.add(word.slice(0, i))
  }

  const ordered = [...prefixes].sort((a, b) => a.length - b.length || (a < b ? -1 : 1))

  const transitions: FATransition[] = []
  for (const prefix of ordered) {
    for (const symbol of alphabet) {
      // The longest suffix of `prefix + symbol` that is still a keyword prefix.
      const extended = prefix + symbol
      let target = ''
      for (let start = 0; start < extended.length; start++) {
        const candidate = extended.slice(start)
        if (prefixes.has(candidate)) {
          target = candidate
          break
        }
      }
      transitions.push({
        id: faTransitionId(prefixState(prefix), symbol, prefixState(target)),
        from: prefixState(prefix),
        read: symbol,
        to: prefixState(target),
      })
    }
  }

  return {
    kind: 'DFA',
    states: ordered.map(prefixState),
    alphabet: [...alphabet],
    transitions,
    start: prefixState(''),
    // A state accepts when *some* keyword ends there — not only when the whole
    // prefix is one. Searching for {abb, b}, the state for prefix "ab" has to
    // accept, because the text so far ends in "b". Checking only for an exact
    // match misses every keyword that is a suffix of a longer one's prefix.
    accepting: ordered.filter((p) => keywords.some((k) => p.endsWith(k))).map(prefixState),
  }
}

export interface Match {
  keyword: string
  /** Index of the first character of the match in the text. */
  start: number
  /** Index one past the last character. */
  end: number
}

export interface SearchResult {
  machines: KeywordMachines
  /** Every occurrence, in the order the scan found them. */
  matches: Match[]
  /** The DFA state after each character, for the head-scan animation. */
  path: StateId[]
}

/**
 * Scan text for every occurrence of every keyword.
 *
 * Overlapping matches are all reported: `webay` contains both `web` and `ebay`,
 * and a search that reported only the first would be wrong in a way that is easy
 * to miss and hard to debug.
 *
 * A character outside the keyword alphabet cannot continue any prefix, so the
 * machine returns to the start — the same thing the DFA's own transitions do for
 * a character that breaks every partial match.
 */
export function searchText(keywords: readonly string[], text: string): Result<SearchResult> {
  const characters = [...text]
  const built = keywordMachines(keywords, characters)
  if (!built.ok) return built

  const machines = built.value

  // The shared simulator, not a private one. `keywordDFA` is complete over the
  // whole alphabet, so the run never dies and every step carries the state after
  // one more character — which is exactly the head-scan path.
  const run = simulateDFA(machines.dfa, characters)
  if (!run.ok) return run

  // Step 0 is the start state before anything is read, and the final step is the
  // accept/reject verdict, which repeats the last state. Exactly one step per
  // character lies between them; taking the verdict too would report the last
  // match twice.
  const path = run.value.steps
    .slice(1, 1 + characters.length)
    .map((step) => (step.snapshot as DFASnapshot).state)
    .filter((state): state is StateId => state !== null)

  const accepting = new Set(machines.dfa.accepting)
  const matches: Match[] = []

  path.forEach((state, index) => {
    // A state is named by the prefix it stands for, so every keyword that is a
    // suffix of that prefix has just finished here — which is how overlapping
    // matches fall out without a second pass.
    if (!accepting.has(state)) return
    const prefix = state === 'start' ? '' : state
    for (const keyword of keywords) {
      if (prefix.endsWith(keyword)) {
        matches.push({ keyword, start: index + 1 - keyword.length, end: index + 1 })
      }
    }
  })

  return ok({ machines, matches, path })
}

function checkKeywords(keywords: readonly string[]): ValidationError[] {
  if (keywords.length === 0) {
    return [
      validationError('NO_KEYWORDS', 'Give at least one keyword to search for.', { kind: 'machine' }),
    ]
  }
  return keywords
    .filter((word) => word === '')
    .map(() =>
      validationError(
        'EMPTY_KEYWORD',
        'The empty string is not a keyword — it occurs everywhere, so searching for it means nothing.',
        { kind: 'machine' },
      ),
    )
}
