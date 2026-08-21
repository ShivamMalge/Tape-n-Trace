/**
 * Module 1 exercises — finite automata, from the department question bank.
 *
 * Construction exercises carry a reference as a machine or an expression; the
 * grader compares *languages*, so the reference being written the short way
 * changes nothing about what passes. Prompts keep the bank's own wording,
 * lightly trimmed; `source` records the bank number.
 */

import { faTransitionId } from '@tape-n-trace/engine'
import type { FATransition, FiniteAutomaton, Read, StateId } from '@tape-n-trace/engine'
import type { Exercise } from '../../lib/exercises'

function t(from: StateId, read: Read, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

/**
 * The parity machine over {a, b}: state (parity of a's, parity of b's).
 * Accepting condition supplied, since the bank asks for several combinations.
 */
function parityMachine(acceptA: 'even' | 'odd', acceptB: 'even' | 'odd'): FiniteAutomaton {
  const states = ['ee', 'oe', 'eo', 'oo']
  const flipA: Record<string, string> = { ee: 'oe', oe: 'ee', eo: 'oo', oo: 'eo' }
  const flipB: Record<string, string> = { ee: 'eo', eo: 'ee', oe: 'oo', oo: 'oe' }
  return {
    kind: 'DFA',
    states,
    alphabet: ['a', 'b'],
    transitions: states.flatMap((s) => [t(s, 'a', flipA[s] as string), t(s, 'b', flipB[s] as string)]),
    start: 'ee',
    accepting: [(acceptA === 'odd' ? 'o' : 'e') + (acceptB === 'odd' ? 'o' : 'e')],
  }
}

/** Length mod n = 0 over {a, b}: a cycle of n states. */
function lengthMod(n: number): FiniteAutomaton {
  const states = Array.from({ length: n }, (_, i) => `r${i}`)
  return {
    kind: 'DFA',
    states,
    alphabet: ['a', 'b'],
    transitions: states.flatMap((s, i) => [
      t(s, 'a', states[(i + 1) % n] as string),
      t(s, 'b', states[(i + 1) % n] as string),
    ]),
    start: 'r0',
    accepting: ['r0'],
  }
}

export const MODULE1: Exercise[] = [
  {
    id: 'm1-starts-ab',
    topic: 'fa.dfa',
    prompt: "Draw a DFA for the language of strings starting with 'ab' over Σ = {a, b}.",
    kind: 'construct-dfa',
    reference: { kind: 'regex', source: 'ab(a+b)*', alphabet: ['a', 'b'] },
    grader: 'language-equivalence',
    hints: [
      'You need to remember how much of "ab" has been seen: nothing, an a, or all of it.',
      'A string that starts wrong can never recover — where do those strings go?',
      'Four states: start, seen a, seen ab (accepting), and a trap.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #3(i)',
  },
  {
    id: 'm1-contains-001',
    topic: 'fa.dfa',
    prompt: 'Design a DFSM for L = {w ∈ {0,1}* : w has 001 as a substring}.',
    kind: 'construct-dfa',
    reference: { kind: 'regex', source: '(0+1)*001(0+1)*', alphabet: ['0', '1'] },
    grader: 'language-equivalence',
    hints: [
      'Track the longest prefix of 001 you have just seen.',
      'From "00", reading another 0 stays at "00" — not back to the start.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #6(i)',
  },
  {
    id: 'm1-odd-a-even-b',
    topic: 'fa.dfa',
    prompt: "Design a DFSM for L = {w ∈ {a,b}* : w contains an odd number of a's and an even number of b's}.",
    kind: 'construct-dfa',
    reference: { kind: 'machine', machine: parityMachine('odd', 'even') },
    grader: 'language-equivalence',
    hints: [
      'The machine only needs to remember two bits: the parity of the a-count and of the b-count.',
      'Four states, one per parity pair. Reading a flips one bit; reading b flips the other.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'b',
    source: 'Question Bank #6(ii)',
  },
  {
    id: 'm1-odd-a-odd-b',
    topic: 'fa.dfa',
    prompt: "Obtain a DFA accepting strings of a's and b's having an odd number of a's and an odd number of b's.",
    kind: 'construct-dfa',
    reference: { kind: 'machine', machine: parityMachine('odd', 'odd') },
    grader: 'language-equivalence',
    hints: ['Same four parity states as the odd-a even-b problem — only the accepting state moves.'],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'b',
    source: 'Question Bank #7(b)',
  },
  {
    id: 'm1-start-end-differ',
    topic: 'fa.dfa',
    prompt: 'Obtain a DFA for the language of strings starting and ending with different characters, over Σ = {0, 1}.',
    kind: 'construct-dfa',
    reference: { kind: 'regex', source: '0(0+1)*1+1(0+1)*0', alphabet: ['0', '1'] },
    grader: 'language-equivalence',
    hints: [
      'The first symbol decides which half of the machine you are in.',
      'Within each half, track only what the last symbol was.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #7(a)',
  },
  {
    id: 'm1-length-mod-3',
    topic: 'fa.dfa',
    prompt: 'Construct a DFA for L = {w ∈ {a,b}* : |w| mod 3 = 0}.',
    kind: 'construct-dfa',
    reference: { kind: 'machine', machine: lengthMod(3) },
    grader: 'language-equivalence',
    hints: ['Only the length matters, so every symbol does the same thing: advance a counter mod 3.'],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'b',
    source: 'Question Bank #4(ii)',
  },
  {
    id: 'm1-length-mod-5',
    topic: 'fa.dfa',
    prompt: 'Design a DFA to accept strings of a’s and b’s where L = {w : |w| mod 5 = 0}.',
    kind: 'construct-dfa',
    reference: { kind: 'machine', machine: lengthMod(5) },
    grader: 'language-equivalence',
    hints: ['A cycle of five states; the start state is also the accepting one.'],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #14',
  },
  {
    id: 'm1-contains-aba',
    topic: 'fa.dfa',
    prompt: "Design a DFA over {a, b} accepting strings that contain 'aba' as a substring.",
    kind: 'construct-dfa',
    reference: { kind: 'regex', source: '(a+b)*aba(a+b)*', alphabet: ['a', 'b'] },
    grader: 'language-equivalence',
    hints: [
      'Track the longest suffix of what you have read that is a prefix of aba.',
      'From "ab", reading b does not go back to the start — nothing of aba survives, so it does.',
      'From "aba" (accepting), everything loops.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'b',
    source: 'Question Bank #14(ii)',
  },
  {
    id: 'm1-nfa-aba-or-even',
    topic: 'fa.nfa',
    prompt: 'Design a nondeterministic FSM for L = {w ∈ {a,b}* : w = aba or |w| is even}.',
    kind: 'construct-nfa',
    reference: { kind: 'regex', source: 'aba+((a+b)(a+b))*', alphabet: ['a', 'b'] },
    grader: 'language-equivalence',
    hints: [
      'Nondeterminism lets you guess at the start which condition the string will satisfy.',
      'One branch checks for exactly aba; the other counts length parity. They never need to talk.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #11(i)',
  },
  {
    id: 'm1-nfa-optional-a',
    topic: 'fa.nfa',
    prompt: "Design an NDFSM for L = {w ∈ {a,b}* : w is an optional a, followed by aa, followed by zero or more b's}.",
    kind: 'construct-nfa',
    reference: { kind: 'regex', source: '(a+ε)aab*', alphabet: ['a', 'b'] },
    grader: 'language-equivalence',
    hints: ['The language is (a + ε) aa b* — build it piece by piece.'],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'b',
    source: 'Question Bank #11(ii)',
  },
  {
    id: 'm1-define-terms',
    topic: 'fa.basics',
    prompt: 'Define, with an example each: (i) alphabet, (ii) power of an alphabet, (iii) language.',
    kind: 'explain',
    reference: { kind: 'none' },
    grader: 'manual',
    hints: [
      'The strings-and-languages primer page covers all three, with the Σ* widget.',
      'Remember Σ⁰ = {ε} — one element, not zero.',
    ],
    marks: 5,
    bloom: 'CL2',
    co: 'CO1',
    source: 'Question Bank #1',
  },
  {
    id: 'm1-dfa-vs-nfa',
    topic: 'fa.nfa',
    prompt: 'Explain the differences between DFAs and NFAs.',
    kind: 'explain',
    reference: { kind: 'none' },
    grader: 'manual',
    hints: [
      'δ is a function for a DFA and a relation for an NFA — one successor versus a set of them.',
      'Same expressive power (the subset construction), different cost: an NFA can be exponentially smaller.',
      'Run the NFA simulator and watch the branch tree; a DFA run is a single path.',
    ],
    marks: 5,
    bloom: 'CL2',
    co: 'CO1',
    source: 'Question Bank #2',
  },
  {
    id: 'm1-enfa-abc',
    topic: 'fa.enfa',
    prompt: "Obtain an ε-NFA accepting zero or more a's, followed by zero or more b's, followed by zero or more c's.",
    kind: 'construct-nfa',
    reference: { kind: 'regex', source: 'a*b*c*', alphabet: ['a', 'b', 'c'] },
    grader: 'language-equivalence',
    hints: [
      'Three looping states chained by ε-transitions — the ε-moves let the machine skip a phase.',
      'The empty string must be accepted: the closure of the start reaches the end.',
    ],
    marks: 8,
    bloom: 'CL3',
    co: 'CO1',
    part: 'a',
    source: 'Question Bank #10',
  },
]
