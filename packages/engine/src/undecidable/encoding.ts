/**
 * Coding strings and Turing machines as binary — Hopcroft 2e §9.1.1 and §9.1.2.
 *
 * Two numberings, and they are the whole trick of Chapter 9. §9.1.1 puts the
 * binary strings in one-to-one correspondence with the integers, so there is an
 * *i*-th string wᵢ. §9.1.2 writes every Turing machine as a binary string, so
 * every string is a machine — an ill-formed one is the machine with one state
 * and no moves (§9.1.3) — and there is therefore an *i*-th machine Mᵢ. With both
 * numberings in hand the table of Fig. 9.1 exists, and `diagonal.ts` builds it.
 *
 * Nothing here is a display concern. The rules come back as the five integers
 * §9.1.2 assigns, and the caller renders δ(qᵢ, Xⱼ) = (q_k, X_l, D_m) however it
 * likes; `codedRuleText` is provided for narrations only.
 *
 * The book says a machine's transitions may be listed "in some order", so one
 * machine has many codes (Example 9.1 counts 24 for a four-rule machine). The
 * engine must be deterministic (architecture.md §4), so `encodeTM` fixes the
 * order: by state index, then by symbol index. That is a choice the book leaves
 * open, not a claim about it.
 */

import { sortStateIds, tmTransitionId } from '../ids.js'
import { EngineInvariantError, err, ok, validationError, type Result, type ValidationError } from '../result.js'
import type { StateId, Sym, TMTransition, TuringMachine } from '../types.js'

// ---------------------------------------------------------------------------
// §9.1.1 — Enumerating the binary strings
// ---------------------------------------------------------------------------

/**
 * wᵢ, the i-th binary string — §9.1.1.
 *
 * "If w is a binary string, treat 1w as a binary integer i." So the integer is
 * read back by dropping its leading 1: w₁ = ε, w₂ = 0, w₃ = 1, w₄ = 00, w₅ = 01.
 * Strings are thereby ordered by length, and within a length lexicographically.
 *
 * `bigint` throughout because the codes of §9.1.2 are long: Fig. 8.9's machine
 * is a 260-bit string, so *its* index has no business being a `number`.
 */
export function binaryString(i: number | bigint): string {
  const n = BigInt(i)
  if (n < 1n) {
    throw new EngineInvariantError(`There is no ${String(i)}-th binary string; §9.1.1 numbers them from 1.`)
  }
  return n.toString(2).slice(1)
}

/** The index of a binary string — the inverse of `binaryString`. */
export function stringIndex(w: string): bigint {
  if (!/^[01]*$/.test(w)) {
    throw new EngineInvariantError(`"${w}" is not a binary string, so §9.1.1 gives it no index.`)
  }
  return BigInt(`0b1${w}`)
}

// ---------------------------------------------------------------------------
// §9.1.2 — Codes for Turing machines
// ---------------------------------------------------------------------------

/** One transition, as the five integers §9.1.2 assigns it: δ(qᵢ, Xⱼ) = (q_k, X_l, D_m). */
export interface CodedRule {
  i: number
  j: number
  k: number
  l: number
  m: number
  /** 0ⁱ10ʲ10ᵏ10ˡ10ᵐ. */
  code: string
}

export interface TmCode {
  /** C₁11C₂11⋯11C_n. */
  code: string
  rules: CodedRule[]
  /** The machine's states in the book's numbering: `states[n - 1]` is qₙ. q₁ is the start, q₂ the sole accepting state. */
  states: StateId[]
  /** The tape symbols in the book's numbering: X₁ = 0, X₂ = 1, X₃ = B. */
  symbols: Sym[]
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number): string => [...String(n)].map((d) => SUBSCRIPTS[Number(d)] as string).join('')

/** "δ(q₁, X₂) = (q₃, X₁, D₂)" — the rule as §9.1.2 writes it. For narrations. */
export function codedRuleText(rule: CodedRule): string {
  return `δ(q${sub(rule.i)}, X${sub(rule.j)}) = (q${sub(rule.k)}, X${sub(rule.l)}, D${sub(rule.m)})`
}

const ruleCode = (i: number, j: number, k: number, l: number, m: number): string =>
  [i, j, k, l, m].map((n) => '0'.repeat(n)).join('1')

/**
 * Number a machine's states and tape symbols the way §9.1.2 requires.
 *
 * The book fixes q₁ = start, q₂ = the only accepting state, X₁ = 0, X₂ = 1,
 * X₃ = B, and leaves everything else free. What is left is ordered canonically
 * so that encoding the same machine twice gives the same string.
 */
function numbering(machine: TuringMachine): Result<{ states: StateId[]; symbols: Sym[] }> {
  const problems: ValidationError[] = []

  if (Math.max(1, machine.tapes) !== 1) {
    problems.push(
      validationError('CODE_MULTITAPE', `§9.1.2 codes one-tape machines; this machine has ${machine.tapes} tapes.`, {
        kind: 'machine',
      }),
    )
  }
  const input = [...machine.inputAlphabet].sort()
  if (input.length !== 2 || input[0] !== '0' || input[1] !== '1') {
    problems.push(
      validationError(
        'CODE_INPUT_ALPHABET',
        `§9.1.2 codes machines with input alphabet {0, 1}; this machine's is {${machine.inputAlphabet.join(', ')}}.`,
        { kind: 'machine' },
      ),
    )
  }
  if (machine.accepting.length !== 1) {
    problems.push(
      validationError(
        'CODE_ACCEPTING_COUNT',
        `§9.1.2 gives a machine exactly one accepting state, q₂, because a machine may halt as soon as it accepts; this one has ${machine.accepting.length}.`,
        { kind: 'machine' },
      ),
    )
  } else if (machine.accepting[0] === machine.start) {
    problems.push(
      validationError(
        'CODE_START_ACCEPTS',
        `§9.1.2 numbers the start state q₁ and the accepting state q₂, so they cannot be the same state ("${machine.start}").`,
        { kind: 'state', id: machine.start },
      ),
    )
  }
  for (const t of machine.transitions) {
    if (t.move[0] === 'S') {
      problems.push(
        validationError('CODE_STATIONARY', `§9.1.2 codes only D₁ = L and D₂ = R; the move from "${t.from}" stays put.`, {
          kind: 'transition',
          id: t.id,
        }),
      )
    }
  }
  if (problems.length > 0) return err(problems)

  const accepting = machine.accepting[0] as StateId
  const rest = sortStateIds(machine.states.filter((q) => q !== machine.start && q !== accepting))
  const others = sortStateIds(machine.tapeAlphabet.filter((x) => x !== '0' && x !== '1' && x !== machine.blank))

  return ok({
    states: [machine.start, accepting, ...rest],
    symbols: ['0', '1', machine.blank, ...others],
  })
}

/**
 * The binary code for a Turing machine — §9.1.2.
 *
 * Rules are emitted in ascending (state, symbol) order; see the module header
 * for why that order is fixed rather than free.
 */
export function encodeTM(machine: TuringMachine): Result<TmCode> {
  const numbered = numbering(machine)
  if (!numbered.ok) return numbered

  const { states, symbols } = numbered.value
  const stateNumber = new Map(states.map((q, n) => [q, n + 1]))
  const symbolNumber = new Map(symbols.map((x, n) => [x, n + 1]))

  const unknown = machine.transitions.filter(
    (t) =>
      !stateNumber.has(t.from) ||
      !stateNumber.has(t.to) ||
      !symbolNumber.has(t.read[0] as Sym) ||
      !symbolNumber.has(t.write[0] as Sym),
  )
  if (unknown.length > 0) {
    return err(
      unknown.map((t) =>
        validationError('CODE_OFF_MACHINE', `The transition from "${t.from}" names a state or symbol the machine does not have.`, {
          kind: 'transition',
          id: t.id,
        }),
      ),
    )
  }

  const rules: CodedRule[] = machine.transitions
    .map((t) => {
      const i = stateNumber.get(t.from) as number
      const j = symbolNumber.get(t.read[0] as Sym) as number
      const k = stateNumber.get(t.to) as number
      const l = symbolNumber.get(t.write[0] as Sym) as number
      const m = t.move[0] === 'L' ? 1 : 2
      return { i, j, k, l, m, code: ruleCode(i, j, k, l, m) }
    })
    .sort((a, b) => a.i - b.i || a.j - b.j)

  return ok({ code: rules.map((r) => r.code).join('11'), rules, states, symbols })
}

/** How §9.1.2 names the n-th tape symbol: X₁ = 0, X₂ = 1, X₃ = B, and the rest are free. */
export function codedSymbol(n: number): Sym {
  return n === 1 ? '0' : n === 2 ? '1' : n === 3 ? 'B' : `X${n}`
}

export interface DecodedTM {
  /** Whether the string is a well-formed code (§9.1.2). */
  valid: boolean
  /** Why not, in the words the page shows. Absent when the code is well formed. */
  reason?: string
  /**
   * Mᵢ. For an ill-formed code this is §9.1.3's machine with one state and no
   * transitions, whose language is ∅ — not an error: the whole construction
   * depends on *every* binary string naming a machine.
   */
  machine: TuringMachine
  rules: CodedRule[]
}

/** §9.1.3's fallback: one state, no moves, so L(Mᵢ) = ∅. */
function trivialMachine(): TuringMachine {
  return {
    states: ['q1'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    blank: 'B',
    transitions: [],
    start: 'q1',
    accepting: [],
    tapes: 1,
  }
}

const invalid = (reason: string): DecodedTM => ({ valid: false, reason, machine: trivialMachine(), rules: [] })

/**
 * Read a binary string as a Turing machine — §9.1.2, with §9.1.3's fallback.
 *
 * Never fails: an ill-formed string is the one-state machine that makes no
 * moves, and `valid` plus `reason` say why it was read that way.
 *
 * One rule here is stricter than the printed text. The book codes δ, which is a
 * *function*, so a well-formed code lists each (state, symbol) pair once; it
 * does not say what a code that repeats one means. This reads a repeat as
 * ill-formed. Either reading gives L(Mᵢ) = ∅ for every index the table shows,
 * so the choice is invisible there and only reachable by typing a code by hand.
 */
export function decodeTM(code: string): DecodedTM {
  if (!/^[01]*$/.test(code)) return invalid('A code is a binary string, and this one holds a symbol other than 0 and 1.')
  if (code === '') return invalid('A code lists at least one transition, and this string is empty.')
  if (code.includes('111')) {
    return invalid('Three consecutive 1s separate a machine from its input (§9.1.2), so they cannot occur inside a code.')
  }
  if (!code.startsWith('0')) return invalid('Every transition code begins 0ⁱ with i ≥ 1, so a code begins with 0.')
  if (code.endsWith('1')) return invalid('Every transition code ends 0ᵐ with m ≥ 1, so a code ends with 0.')

  const parts = code.split('11')
  const rules: CodedRule[] = []
  for (const part of parts) {
    const match = /^(0+)1(0+)1(0+)1(0+)1(0+)$/.exec(part)
    if (match === null) {
      return invalid(`"${part}" is not a transition: §9.1.2 writes one as 0ⁱ10ʲ10ᵏ10ˡ10ᵐ, five runs of 0s separated by single 1s.`)
    }
    const [i, j, k, l, m] = match.slice(1).map((run) => run.length) as [number, number, number, number, number]
    if (m > 2) {
      return invalid(`D${sub(m)} is not a direction: §9.1.2 gives D₁ = L and D₂ = R, and no others.`)
    }
    rules.push({ i, j, k, l, m, code: part })
  }

  const seen = new Set<string>()
  for (const rule of rules) {
    const key = `${rule.i},${rule.j}`
    if (seen.has(key)) {
      return invalid(`${codedRuleText(rule)} repeats a (state, symbol) pair the code has already given a move for; δ is a function.`)
    }
    seen.add(key)
  }

  const r = Math.max(2, ...rules.flatMap((rule) => [rule.i, rule.k]))
  const s = Math.max(3, ...rules.flatMap((rule) => [rule.j, rule.l]))
  const states = Array.from({ length: r }, (_, n) => `q${n + 1}`)
  const symbols = Array.from({ length: s }, (_, n) => codedSymbol(n + 1))

  const transitions: TMTransition[] = rules.map((rule) => {
    const from = states[rule.i - 1] as StateId
    const to = states[rule.k - 1] as StateId
    const read = symbols[rule.j - 1] as Sym
    const write = symbols[rule.l - 1] as Sym
    const move: 'L' | 'R' = rule.m === 1 ? 'L' : 'R'
    return { id: tmTransitionId(from, [read], [write], [move], to), from, read: [read], to, write: [write], move: [move] }
  })

  return {
    valid: true,
    machine: {
      states,
      inputAlphabet: ['0', '1'],
      tapeAlphabet: symbols,
      blank: 'B',
      transitions,
      start: 'q1',
      accepting: ['q2'],
      tapes: 1,
    },
    rules,
  }
}

/** Mᵢ — the i-th Turing machine (§9.1.2), read off wᵢ. */
export function machineAt(i: number | bigint): DecodedTM {
  return decodeTM(binaryString(i))
}

// ---------------------------------------------------------------------------
// Coded pairs — §9.1.2, last paragraph
// ---------------------------------------------------------------------------

/** The code for (M, w): M's code, then 111, then w — §9.1.2. */
export function encodePair(machine: TuringMachine, word: string): Result<string> {
  if (!/^[01]*$/.test(word)) {
    return err([
      validationError('PAIR_INPUT', `§9.1.2 pairs a machine with a binary string; "${word}" is not one.`, { kind: 'machine' }),
    ])
  }
  const coded = encodeTM(machine)
  return coded.ok ? ok(`${coded.value.code}111${word}`) : coded
}

/**
 * Split a coded pair back into machine and input.
 *
 * "Since no valid code for a TM contains three 1's in a row, we can be sure that
 * the first occurrence of 111 separates the code for M from w."
 */
export function splitPair(coded: string): { machineCode: string; word: string } | null {
  const at = coded.indexOf('111')
  if (at === -1) return null
  return { machineCode: coded.slice(0, at), word: coded.slice(at + 3) }
}

// ---------------------------------------------------------------------------
// Landmarks in the enumeration
// ---------------------------------------------------------------------------

/**
 * The smallest i for which wᵢ is a well-formed code — 682, and w₆₈₂ = 010101010.
 *
 * This is the arithmetic behind the footnote to Fig. 9.1: a code needs five runs
 * of 0s and four separating 1s, so the shortest is nine bits, and every string
 * before it is §9.1.3's machine with no moves. The first 681 rows of the real
 * table are solid 0s. `test/undecidable.test.ts` finds this number by search
 * rather than trusting it.
 */
export const FIRST_CODE_INDEX = 682

/**
 * The smallest i whose code has a move into q₂ — 1354. Its code is 0101001010,
 * which is δ(q₁, X₁) = (q₂, X₁, D₁): M₁₃₅₄ reads a 0 and accepts, so it accepts
 * every string beginning with 0 and nothing else. Every Mᵢ before it accepts
 * nothing whatsoever, so this is the first row of Fig. 9.1 that is not all 0s.
 */
export const FIRST_ACCEPTING_CODE_INDEX = 1354

/**
 * The smallest i for which Mᵢ fails to halt on some input — 2602. Its code is
 * 01000101010, which is δ(q₁, X₃) = (q₁, X₁, D₁): on the empty input M₂₆₀₂ reads
 * the blank, writes a 0, moves left, and does the same for ever.
 *
 * This is the first row of the table with a cell that has no answer, and it is
 * worth reaching for: everything before it halts, so nothing before it can show
 * what the step budget is actually for.
 */
export const FIRST_NON_HALTING_CODE_INDEX = 2602
