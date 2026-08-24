/**
 * Reducing one problem to another — Hopcroft 2e §8.1.3, and the reductions of
 * §9.2 that the prescribed sections reach.
 *
 * Fig. 8.7 is the whole idea: an instance of P₁ goes into a box that constructs
 * an instance of P₂, the hypothetical algorithm for P₂ decides it, and the
 * answer is the answer for P₁. Since no algorithm for P₁ exists, none for P₂
 * does either.
 *
 * Two rules from the printed text are enforced here rather than left to the
 * reader, because both are the mistakes the section exists to prevent.
 *
 * **Direction** (the box on p. 316). "The only way to prove a new problem P₂ to
 * be undecidable is to reduce a known undecidable problem P₁ to P₂." Reducing
 * from a problem that is decidable proves nothing at all, so `reduce` refuses it
 * and says why, instead of drawing a diagram that looks like a proof.
 *
 * **What the source problem buys you** (p. 380). A reduction from L_u shows a
 * problem is not recursive, and says nothing about whether it is RE. Only a
 * reduction from L_d can show a problem is not RE — and L_u, being RE itself, is
 * useless for that. The conclusion each trace reaches is drawn from the source's
 * status rather than asserted.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result } from '../result.js'
import type { Step, Trace } from '../types.js'

/**
 * Where a problem sits, in the terms of §9.2.1: decidable means recursive, and
 * undecidable means not recursive. `undecidable` is used where the prescribed
 * sections establish undecidability without settling RE-ness — §8.1's problems
 * are about C programs and are never placed in Fig. 9.2.
 */
export type ProblemStatus = 'decidable' | 'undecidable' | 're-not-recursive' | 'not-re'

export interface Problem {
  id: string
  name: string
  /** The question, in the words the book asks it. */
  question: string
  /** The language, where the book names one. */
  language?: string
  status: ProblemStatus
  /** Why it has that status. */
  why: string
  citation: string
}

export const PROBLEMS: Problem[] = [
  {
    id: 'hello-world',
    name: 'The hello-world problem',
    question: 'Does program P, given input I, print hello, world as the first thing it prints?',
    status: 'undecidable',
    why: 'A tester H would let us build H₂, which prints hello, world when given itself as input exactly when it does not. The contradiction is §8.1.2, and it is where every other undecidability result in the chapter starts.',
    citation: '8.1.2',
  },
  {
    id: 'calls-foo',
    name: 'The calls-foo problem',
    question: 'Does program Q, given input y, ever call the function foo?',
    status: 'undecidable',
    why: 'Example 8.1 reduces the hello-world problem to it.',
    citation: '8.1.3, Example 8.1',
  },
  {
    id: 'any-output',
    name: 'The any-output problem',
    question: 'Does program P, given input I, ever produce any output at all?',
    status: 'undecidable',
    why: 'Exercise 8.1.1(b) asks for the reduction from the hello-world problem.',
    citation: '8.1.4, Exercise 8.1.1(b)',
  },
  {
    id: 'halting',
    name: 'The halting problem',
    question: 'Does Turing machine M halt on input w, whether or not it accepts?',
    language: '{(M, w) | w is in H(M)}',
    status: 're-not-recursive',
    why: 'The box in §9.2.4 defines H(M) as the inputs on which M halts and states that the halting problem is RE but not recursive; Exercise 9.2.1 asks for the proof. This is the problem Turing himself posed — his machines accepted by halting, not by final state.',
    citation: '9.2.4',
  },
  {
    id: 'l-u',
    name: 'The universal language L_u',
    question: 'Does Turing machine M accept input w?',
    language: 'L_u = {(M, w) | w is in L(M)}',
    status: 're-not-recursive',
    why: 'Theorem 9.6. It is RE because the universal Turing machine of §9.2.3 accepts it, and it is not recursive because a decider for it would give a Turing machine for L_d.',
    citation: '9.2.4, Thm 9.6',
  },
  {
    id: 'complement-l-u',
    name: 'The complement of L_u',
    question: 'Is the pair (M, w) one where M does not accept w?',
    language: 'the complement of L_u',
    status: 'not-re',
    why: 'L_u is RE but not recursive (Theorem 9.6), so by Theorem 9.4 its complement cannot be RE — if it were, both would be RE and L_u would be recursive.',
    citation: '9.2.2, Thm 9.4',
  },
  {
    id: 'l-d',
    name: 'The diagonalization language L_d',
    question: 'Is the string wᵢ one that the machine it codes does not accept?',
    language: 'L_d = {wᵢ | wᵢ is not in L(Mᵢ)}',
    status: 'not-re',
    why: 'Theorem 9.2. No Turing machine accepts it at all, which is stronger than undecidability.',
    citation: '9.1.4, Thm 9.2',
  },
  {
    id: 'dfa-membership',
    name: 'Membership in a regular language',
    question: 'Does a given DFA accept a given string w?',
    status: 'decidable',
    why: 'Run the machine. It makes exactly |w| moves and stops, so the procedure is an algorithm — the simulator does it.',
    citation: '2.2.5',
  },
]

export function problemById(id: string): Problem | undefined {
  return PROBLEMS.find((problem) => problem.id === id)
}

/** Whether a reduction may start here — the box on p. 316. */
export function isKnownHard(problem: Problem): boolean {
  return problem.status !== 'decidable'
}

export interface Reduction {
  /** P₁, the problem already known to be undecidable. */
  from: string
  /** P₂, the problem being shown undecidable. */
  to: string
  /** The box labelled "Construct" in Fig. 8.7, one instruction at a time. */
  construction: string[]
  /** Why the constructed instance has the same answer as the one it came from. */
  correctness: string
  /** Whether the book carries out this reduction or sets it as an exercise. */
  source: 'printed' | 'exercise'
  citation: string
}

export const REDUCTIONS: Reduction[] = [
  {
    from: 'hello-world',
    to: 'calls-foo',
    construction: [
      'If Q has a function called foo, rename it and all calls to that function. The new program Q₁ does exactly what Q does.',
      'Add to Q₁ a function foo. This function does nothing, and is not called. The resulting program is Q₂.',
      'Modify Q₂ to remember the first 12 characters that it prints, storing them in a global array A. The resulting program is Q₃.',
      'Modify Q₃ so that whenever it executes an output statement, it checks in A whether it has written 12 characters or more and whether hello, world are the first 12. In that case, call foo. The resulting program is R, and its input z is y.',
    ],
    correctness:
      'R with input z calls foo exactly when Q with input y prints hello, world as its first output. So an algorithm deciding whether R calls foo would decide the hello-world problem.',
    source: 'printed',
    citation: '8.1.3, Example 8.1',
  },
  {
    from: 'hello-world',
    to: 'halting',
    construction: [
      'Take the program P and its input I — an instance of the hello-world problem.',
      'Modify P so that it prints nothing, remembering instead the first 12 characters it would have printed.',
      'Once 12 characters have been remembered, or when P terminates having printed fewer, compare them with hello, world.',
      'If they match, halt. If they do not, enter a deliberate infinite loop. The result is a program R, run on the same input I.',
    ],
    correctness:
      'R halts on I exactly when P prints hello, world as its first output — including the case where P itself runs forever without printing, where R runs forever too. So an algorithm deciding halting would decide the hello-world problem.',
    source: 'exercise',
    citation: '8.1.4, Exercise 8.1.1(a)',
  },
  {
    from: 'hello-world',
    to: 'any-output',
    construction: [
      'Take the program P and its input I.',
      'Modify P so that it prints nothing at all, remembering instead the first 12 characters it would have printed.',
      'Once 12 characters have been remembered, or when P terminates having printed fewer, compare them with hello, world.',
      'If they match, print a single character and halt. If they do not, halt without printing. The result is a program R, run on the same input I.',
    ],
    correctness:
      'R produces output exactly when P prints hello, world as its first output. So an algorithm deciding whether a program produces any output would decide the hello-world problem.',
    source: 'exercise',
    citation: '8.1.4, Exercise 8.1.1(b)',
  },
  {
    from: 'l-u',
    to: 'halting',
    construction: [
      'Take the pair (M, w) — an instance of L_u.',
      'Build M′, which behaves exactly like M except at the points where M stops.',
      'Wherever M would halt without accepting — δ undefined in a nonaccepting state — give M′ instead a pair of moves that carries it right and then back left forever, so it never halts.',
      'Leave M′ halting wherever M accepts. The instance of the halting problem is (M′, w).',
    ],
    correctness:
      'M′ halts on w exactly when M accepts w. So an algorithm deciding the halting problem would decide L_u, which Theorem 9.6 says is not recursive.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.1',
  },
  {
    from: 'halting',
    to: 'l-u',
    construction: [
      'Take the pair (M, w) — an instance of the halting problem.',
      'Build M″, which behaves exactly like M except at the points where M stops.',
      'Give M″ a new accepting state, and send it there from every configuration in which M halts, whether M accepts there or not.',
      'The instance of L_u is the pair (M″, w).',
    ],
    correctness:
      'M″ accepts w exactly when M halts on w, accepting or not. So an algorithm deciding L_u would decide the halting problem.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.1',
  },
  {
    from: 'l-d',
    to: 'complement-l-u',
    construction: [
      'Take a string w — an instance of L_d.',
      'Copy it, so that the input becomes w111w. A second tape does the copying, and the two-tape machine is then converted to one tape.',
      'Feed w111w to the hypothetical machine M for the complement of L_u.',
      'Accept whenever M accepts. The result is the machine M′ of Fig. 9.6.',
    ],
    correctness:
      'Since w111w codes the pair (Mᵢ, wᵢ) when w is wᵢ, M accepts it exactly when Mᵢ does not accept wᵢ — that is, exactly when w is in L_d. So M′ would accept L_d, and Theorem 9.2 says no machine does.',
    source: 'printed',
    citation: '9.2.4, Fig. 9.6',
  },
]

export function reductionsFrom(id: string): Reduction[] {
  return REDUCTIONS.filter((r) => r.from === id)
}

export function reductionBetween(from: string, to: string): Reduction | undefined {
  return REDUCTIONS.find((r) => r.from === from && r.to === to)
}

// ---------------------------------------------------------------------------
// The trace
// ---------------------------------------------------------------------------

export interface ProblemReductionSnapshot {
  from: Problem
  to: Problem
  reduction: Reduction
  phase: 'known' | 'target' | 'assume' | 'construct' | 'correctness' | 'contradiction'
  /** Which construction instruction is current, while the construction is being built. */
  step: number | null
  [key: string]: unknown
}

export type ProblemReductionTrace = Trace<Step<ProblemReductionSnapshot>>

/** What a reduction from a problem of this status establishes about its target — p. 380. */
function conclusionFor(from: Problem, to: Problem): string {
  if (from.status === 'not-re') {
    return `${to.name} is not recursively enumerable: no Turing machine accepts it at all. Only a source that is itself not RE can prove that — a reduction from L_u could not, because L_u is RE.`
  }
  return `${to.name} is undecidable: it is not a recursive language, so no algorithm decides it. A reduction from a source that is RE settles decidability and nothing more — whether ${to.name} is itself RE is a separate question.`
}

/**
 * Build A ≤ B, as Fig. 8.7 draws it.
 *
 * Refuses rather than obliges when the reduction would prove nothing: a source
 * that is decidable, a problem reduced to itself, or a pair the prescribed
 * sections carry no construction for. Inventing a construction to fill the gap
 * would be the one thing this page must not do.
 */
export function reduce(fromId: string, toId: string): Result<ProblemReductionTrace> {
  const from = problemById(fromId)
  const to = problemById(toId)

  if (from === undefined || to === undefined) {
    return err(
      [fromId, toId]
        .filter((id) => problemById(id) === undefined)
        .map((id) => validationError('REDUCTION_UNKNOWN_PROBLEM', `There is no problem called "${id}" on this page.`, { kind: 'machine' })),
    )
  }

  if (from.id === to.id) {
    return err([
      validationError(
        'REDUCTION_SELF',
        `Every problem reduces to itself by doing nothing, so ${from.name} reduced to itself proves nothing about it.`,
        { kind: 'machine' },
      ),
    ])
  }

  if (!isKnownHard(from)) {
    return err([
      validationError(
        'REDUCTION_DIRECTION',
        `${from.name} is decidable, so a reduction cannot start there. The statement it would prove is "if ${to.name} is decidable, then ${from.name} is decidable" — true, and useless, because the conclusion is already known. A reduction must run from a problem already known to be undecidable to the new one (§8.1.3, p. 316).`,
        { kind: 'machine' },
      ),
    ])
  }

  const reduction = reductionBetween(from.id, to.id)
  if (reduction === undefined) {
    const targets = reductionsFrom(from.id).map((r) => problemById(r.to)?.name ?? r.to)
    return err([
      validationError(
        'REDUCTION_NOT_CARRIED_OUT',
        targets.length === 0
          ? `The prescribed sections carry no reduction starting from ${from.name}.`
          : `The prescribed sections carry no reduction from ${from.name} to ${to.name}. From ${from.name} they reach: ${targets.join(', ')}.`,
        { kind: 'machine' },
      ),
    ])
  }

  const builder = new TraceBuilder<ProblemReductionSnapshot>('prove.reduction', { from: from.id, to: to.id })
  const at = (phase: ProblemReductionSnapshot['phase'], step: number | null): ProblemReductionSnapshot => ({
    from,
    to,
    reduction,
    phase,
    step,
  })

  builder.step({
    narration: `Start from a problem already known to be undecidable. ${from.name}: ${from.question} ${from.why}`,
    citation: from.citation,
    snapshot: at('known', null),
  })

  builder.step({
    narration: `The problem to settle is ${to.name}, which asks: ${to.question} Nothing is assumed about it yet.`,
    citation: to.citation,
    snapshot: at('target', null),
  })

  builder.step({
    narration: `Suppose there were an algorithm that decides it — the diamond marked "Decide" in Fig. 8.7, which answers yes or no for every instance and always finishes.`,
    citation: '8.1.3, Fig. 8.7',
    snapshot: at('assume', null),
  })

  reduction.construction.forEach((instruction, index) => {
    builder.bump('constructionSteps')
    builder.step({
      narration: `Construct (${index + 1} of ${reduction.construction.length}): ${instruction}`,
      citation: reduction.citation,
      snapshot: at('construct', index),
    })
  })

  builder.step({
    narration: `The construction preserves the answer. ${reduction.correctness}`,
    citation: reduction.citation,
    snapshot: at('correctness', null),
  })

  builder.step({
    narration: `That is the contradiction: the assumed algorithm for ${to.name}, together with a construction anyone can carry out, would decide ${from.name} — and nothing decides ${from.name}. So the assumed algorithm does not exist. ${conclusionFor(from, to)}`,
    citation: '8.1.3',
    snapshot: at('contradiction', null),
  })

  return ok(
    builder.build({
      type: 'verdict',
      holds: true,
      witness: { from: from.id, to: to.id, proves: from.status === 'not-re' ? 'not-re' : 'undecidable' },
    }),
  )
}
