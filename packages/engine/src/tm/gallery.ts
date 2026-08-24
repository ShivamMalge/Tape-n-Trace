/**
 * The Turing-machine gallery — Hopcroft 2e chapter 8, machine for machine.
 *
 * Where the book prints a table or a diagram, the preset is that table: Fig.
 * 8.9 (0ⁿ1ⁿ), Fig. 8.11 (proper subtraction), Example 8.6 (storage in the
 * state), Example 8.7 (multiple tracks), Figs. 8.14–8.15 (the Copy
 * subroutine and the multiplication program that calls it), Exercise 8.4.2's
 * nondeterministic machine. The rest follow the exercises' contracts —
 * Exercise 8.2.3's binary increment is built to its stated IDs.
 *
 * Every preset documents what it does on a sample input, and the tests hold
 * it to that: the output, and a bound on the number of moves.
 */

import { tmTransitionId } from '../ids.js'
import type { Sym, TMTransition, TuringMachine } from '../types.js'

export type Technique = 'basic' | 'function' | 'storage' | 'tracks' | 'subroutine' | 'multitape' | 'nondeterministic' | 'busy-beaver'

export interface TmExpectation {
  input: string
  /** Whether the run ends in an accepting state. */
  accepted: boolean
  /** The nonblank tape content at the halt, for function-computing machines. */
  output?: string
  /** The run makes at most this many moves. */
  maxMoves: number
}

export interface TmPreset {
  id: string
  title: string
  blurb: string
  machine: TuringMachine
  technique: Technique
  citation: string
  suggested: string[]
  expected: TmExpectation[]
  /** For Example 8.7-style machines: how a typed string becomes tape symbols. */
  encodeInput?: (word: string) => Sym[]
  /** The states that form the subroutine of §8.3.3, when there is one. */
  subroutine?: { name: string; states: string[] }
  /** The machine is known not to halt on some inputs (§8.2.6). */
  nonHalting?: { inputs: string; why: string }
}

type Move = 'L' | 'R' | 'S'

function t(from: string, read: string, to: string, write: string, move: Move): TMTransition {
  return { id: tmTransitionId(from, [read], [write], [move], to), from, read: [read], to, write: [write], move: [move] }
}

function tk(from: string, read: string[], to: string, write: string[], move: Move[]): TMTransition {
  return { id: tmTransitionId(from, read, write, move, to), from, read, to, write, move }
}

/** Fig. 8.9 — accepts {0ⁿ1ⁿ | n ≥ 1}. */
const zerosOnes: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'X', 'Y', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q1', 'X', 'R'),
    t('q0', 'Y', 'q3', 'Y', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '1', 'q2', 'Y', 'L'),
    t('q1', 'Y', 'q1', 'Y', 'R'),
    t('q2', '0', 'q2', '0', 'L'),
    t('q2', 'X', 'q0', 'X', 'R'),
    t('q2', 'Y', 'q2', 'Y', 'L'),
    t('q3', 'Y', 'q3', 'Y', 'R'),
    t('q3', 'B', 'q4', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['q4'],
  tapes: 1,
  layout: { q0: { x: 80, y: 90 }, q1: { x: 260, y: 90 }, q2: { x: 440, y: 90 }, q3: { x: 80, y: 250 }, q4: { x: 260, y: 250 } },
}

/** Fig. 8.11 — computes m ∸ n from 0ᵐ10ⁿ. The book omits F; q6 is marked accepting here so the halt reads as one. */
const monus: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q1', 'B', 'R'),
    t('q0', '1', 'q5', 'B', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '1', 'q2', '1', 'R'),
    t('q2', '0', 'q3', '1', 'L'),
    t('q2', '1', 'q2', '1', 'R'),
    t('q2', 'B', 'q4', 'B', 'L'),
    t('q3', '0', 'q3', '0', 'L'),
    t('q3', '1', 'q3', '1', 'L'),
    t('q3', 'B', 'q0', 'B', 'R'),
    t('q4', '0', 'q4', '0', 'L'),
    t('q4', '1', 'q4', 'B', 'L'),
    t('q4', 'B', 'q6', '0', 'R'),
    t('q5', '0', 'q5', 'B', 'R'),
    t('q5', '1', 'q5', 'B', 'R'),
    t('q5', 'B', 'q6', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['q6'],
  tapes: 1,
  layout: {
    q0: { x: 80, y: 90 },
    q1: { x: 240, y: 90 },
    q2: { x: 400, y: 90 },
    q3: { x: 560, y: 90 },
    q4: { x: 400, y: 260 },
    q5: { x: 80, y: 260 },
    q6: { x: 240, y: 260 },
  },
}

/** Exercise 8.2.3 — $N becomes N+1, halting in qf on the leftmost symbol of N+1; the $ is destroyed. */
const binaryIncrement: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'qf'],
  inputAlphabet: ['$', '0', '1'],
  tapeAlphabet: ['$', '0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '$', 'q1', '$', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '1', 'q1', '1', 'R'),
    t('q1', 'B', 'q2', 'B', 'L'),
    t('q2', '1', 'q2', '0', 'L'),
    t('q2', '0', 'q3', '1', 'L'),
    t('q2', '$', 'q4', '1', 'R'),
    t('q3', '0', 'q3', '0', 'L'),
    t('q3', '1', 'q3', '1', 'L'),
    t('q3', '$', 'qf', 'B', 'R'),
    t('q4', '0', 'qf', '0', 'L'),
  ],
  start: 'q0',
  accepting: ['qf'],
  tapes: 1,
}

/** 0ᵐ10ⁿ becomes 0ᵐ⁺ⁿ: the separator becomes a 0 and the last 0 is erased. */
const unaryAdd: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'qf'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q0', '0', 'R'),
    t('q0', '1', 'q1', '0', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', 'B', 'q2', 'B', 'L'),
    t('q2', '0', 'qf', 'B', 'L'),
  ],
  start: 'q0',
  accepting: ['qf'],
  tapes: 1,
}

/** Palindromes over {0, 1} — Exercise 8.2.2(c)'s idea, with odd lengths allowed: match the ends, erase them, repeat. */
const palindrome: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'qa'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q1', 'B', 'R'),
    t('q0', '1', 'q2', 'B', 'R'),
    t('q0', 'B', 'qa', 'B', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '1', 'q1', '1', 'R'),
    t('q1', 'B', 'q3', 'B', 'L'),
    t('q2', '0', 'q2', '0', 'R'),
    t('q2', '1', 'q2', '1', 'R'),
    t('q2', 'B', 'q4', 'B', 'L'),
    t('q3', '0', 'q5', 'B', 'L'),
    t('q3', 'B', 'qa', 'B', 'R'),
    t('q4', '1', 'q5', 'B', 'L'),
    t('q4', 'B', 'qa', 'B', 'R'),
    t('q5', '0', 'q5', '0', 'L'),
    t('q5', '1', 'q5', '1', 'L'),
    t('q5', 'B', 'q0', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['qa'],
  tapes: 1,
}

/** {aⁿbⁿcⁿ | n ≥ 1} — Exercise 8.2.2(b): mark one a, one b, one c per round. */
const anbncn: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'qa'],
  inputAlphabet: ['a', 'b', 'c'],
  tapeAlphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'],
  blank: 'B',
  transitions: [
    t('q0', 'a', 'q1', 'X', 'R'),
    t('q0', 'Y', 'q4', 'Y', 'R'),
    t('q1', 'a', 'q1', 'a', 'R'),
    t('q1', 'Y', 'q1', 'Y', 'R'),
    t('q1', 'b', 'q2', 'Y', 'R'),
    t('q2', 'b', 'q2', 'b', 'R'),
    t('q2', 'Z', 'q2', 'Z', 'R'),
    t('q2', 'c', 'q3', 'Z', 'L'),
    t('q3', 'Z', 'q3', 'Z', 'L'),
    t('q3', 'b', 'q3', 'b', 'L'),
    t('q3', 'Y', 'q3', 'Y', 'L'),
    t('q3', 'a', 'q3', 'a', 'L'),
    t('q3', 'X', 'q0', 'X', 'R'),
    t('q4', 'Y', 'q4', 'Y', 'R'),
    t('q4', 'Z', 'q4', 'Z', 'R'),
    t('q4', 'B', 'qa', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['qa'],
  tapes: 1,
}

/** Fig. 8.14's Copy, verbatim (q1–q5), with q0 walking over the leading 1 the book starts to the right of. */
const copy: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'X', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '1', 'q1', '1', 'R'),
    t('q1', '0', 'q2', 'X', 'R'),
    t('q1', '1', 'q4', '1', 'L'),
    t('q2', '0', 'q2', '0', 'R'),
    t('q2', '1', 'q2', '1', 'R'),
    t('q2', 'B', 'q3', '0', 'L'),
    t('q3', '0', 'q3', '0', 'L'),
    t('q3', '1', 'q3', '1', 'L'),
    t('q3', 'X', 'q1', 'X', 'R'),
    t('q4', 'X', 'q4', '0', 'L'),
    t('q4', '1', 'q5', '1', 'R'),
  ],
  start: 'q0',
  accepting: ['q5'],
  tapes: 1,
}

/** Fig. 8.15 — 0ᵐ10ⁿ1 becomes 0ᵐⁿ, calling the Copy subroutine (q1–q5) m times. */
const multiply: TuringMachine = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'X', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q6', 'B', 'R'),
    t('q6', '0', 'q6', '0', 'R'),
    t('q6', '1', 'q1', '1', 'R'),
    t('q1', '0', 'q2', 'X', 'R'),
    t('q1', '1', 'q4', '1', 'L'),
    t('q2', '0', 'q2', '0', 'R'),
    t('q2', '1', 'q2', '1', 'R'),
    t('q2', 'B', 'q3', '0', 'L'),
    t('q3', '0', 'q3', '0', 'L'),
    t('q3', '1', 'q3', '1', 'L'),
    t('q3', 'X', 'q1', 'X', 'R'),
    t('q4', 'X', 'q4', '0', 'L'),
    t('q4', '1', 'q5', '1', 'R'),
    t('q5', '0', 'q7', '0', 'L'),
    t('q7', '1', 'q8', '1', 'L'),
    t('q8', '0', 'q9', '0', 'L'),
    t('q9', '0', 'q9', '0', 'L'),
    t('q9', 'B', 'q0', 'B', 'R'),
    t('q8', 'B', 'q10', 'B', 'R'),
    t('q10', '1', 'q11', 'B', 'R'),
    t('q11', '0', 'q11', 'B', 'R'),
    t('q11', '1', 'q12', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['q12'],
  tapes: 1,
}

/** Rado's 2-state busy beaver: on a blank tape, writes four 1s and halts after six moves. */
const busyBeaver2: TuringMachine = {
  states: ['A', 'B', 'H'],
  inputAlphabet: ['1'],
  tapeAlphabet: ['0', '1'],
  blank: '0',
  transitions: [t('A', '0', 'B', '1', 'R'), t('A', '1', 'B', '1', 'L'), t('B', '0', 'A', '1', 'L'), t('B', '1', 'H', '1', 'R')],
  start: 'A',
  accepting: ['H'],
  tapes: 1,
}

/** The 3-state busy beaver that writes the most 1s (Lin and Rado): six of them, halting after 14 moves. */
const busyBeaver3: TuringMachine = {
  states: ['A', 'B', 'C', 'H'],
  inputAlphabet: ['1'],
  tapeAlphabet: ['0', '1'],
  blank: '0',
  transitions: [
    t('A', '0', 'B', '1', 'R'),
    t('A', '1', 'H', '1', 'R'),
    t('B', '0', 'C', '0', 'R'),
    t('B', '1', 'B', '1', 'R'),
    t('C', '0', 'C', '1', 'L'),
    t('C', '1', 'A', '1', 'L'),
  ],
  start: 'A',
  accepting: ['H'],
  tapes: 1,
}

/** Halts on inputs starting with 0; on inputs starting with 1 it moves right forever — §8.2.6 made concrete. */
const neverHalts: TuringMachine = {
  states: ['q0', 'q1', 'qa'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'qa', '0', 'R'),
    t('q0', '1', 'q1', '1', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '1', 'q1', '1', 'R'),
    t('q1', 'B', 'q1', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['qa'],
  tapes: 1,
}

/** Example 8.6 — 01* + 10*: the first symbol is stored in the state, as [q1, 0] or [q1, 1]. */
const storageInState: TuringMachine = {
  states: ['[q0,B]', '[q1,0]', '[q1,1]', '[q1,B]'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('[q0,B]', '0', '[q1,0]', '0', 'R'),
    t('[q0,B]', '1', '[q1,1]', '1', 'R'),
    t('[q1,0]', '1', '[q1,0]', '1', 'R'),
    t('[q1,0]', 'B', '[q1,B]', 'B', 'R'),
    t('[q1,1]', '0', '[q1,1]', '0', 'R'),
    t('[q1,1]', 'B', '[q1,B]', 'B', 'R'),
  ],
  start: '[q0,B]',
  accepting: ['[q1,B]'],
  tapes: 1,
}

/** Example 8.7 — L_wcw with a second track of check marks; a cell is written `mark|symbol`. */
const tracks: TuringMachine = (() => {
  const cell = (mark: 'B' | '*', symbol: string): string => `${mark}|${symbol}`
  const transitions: TMTransition[] = []
  for (const a of ['0', '1']) {
    transitions.push(t('[q1,B]', cell('B', a), `[q2,${a}]`, cell('*', a), 'R'))
    for (const b of ['0', '1']) {
      transitions.push(t(`[q2,${a}]`, cell('B', b), `[q2,${a}]`, cell('B', b), 'R'))
      transitions.push(t(`[q3,${a}]`, cell('*', b), `[q3,${a}]`, cell('*', b), 'R'))
    }
    transitions.push(t(`[q2,${a}]`, cell('B', 'c'), `[q3,${a}]`, cell('B', 'c'), 'R'))
    transitions.push(t(`[q3,${a}]`, cell('B', a), '[q4,B]', cell('*', a), 'L'))
    transitions.push(t('[q4,B]', cell('*', a), '[q4,B]', cell('*', a), 'L'))
    transitions.push(t('[q5,B]', cell('B', a), '[q6,B]', cell('B', a), 'L'))
    transitions.push(t('[q6,B]', cell('B', a), '[q6,B]', cell('B', a), 'L'))
    transitions.push(t('[q6,B]', cell('*', a), '[q1,B]', cell('*', a), 'R'))
    transitions.push(t('[q5,B]', cell('*', a), '[q7,B]', cell('*', a), 'R'))
    transitions.push(t('[q8,B]', cell('*', a), '[q8,B]', cell('*', a), 'R'))
  }
  transitions.push(t('[q4,B]', cell('B', 'c'), '[q5,B]', cell('B', 'c'), 'L'))
  transitions.push(t('[q7,B]', cell('B', 'c'), '[q8,B]', cell('B', 'c'), 'R'))
  transitions.push(t('[q8,B]', cell('B', 'B'), '[q9,B]', cell('B', 'B'), 'R'))
  return {
    states: ['[q1,B]', '[q2,0]', '[q2,1]', '[q3,0]', '[q3,1]', '[q4,B]', '[q5,B]', '[q6,B]', '[q7,B]', '[q8,B]', '[q9,B]'],
    inputAlphabet: [cell('B', '0'), cell('B', '1'), cell('B', 'c')],
    tapeAlphabet: [cell('B', '0'), cell('B', '1'), cell('B', 'c'), cell('*', '0'), cell('*', '1'), cell('*', 'c'), cell('B', 'B')],
    blank: cell('B', 'B'),
    transitions,
    start: '[q1,B]',
    accepting: ['[q9,B]'],
    tapes: 1,
  }
})()

/** Exercise 8.4.2 — a nondeterministic machine: in q1 it may go either way. */
const ntm: TuringMachine = {
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    t('q0', '0', 'q0', '1', 'R'),
    t('q0', '1', 'q1', '0', 'R'),
    t('q1', '0', 'q1', '0', 'R'),
    t('q1', '0', 'q0', '0', 'L'),
    t('q1', '1', 'q1', '1', 'R'),
    t('q1', '1', 'q0', '1', 'L'),
    t('q1', 'B', 'q2', 'B', 'R'),
  ],
  start: 'q0',
  accepting: ['q2'],
  tapes: 1,
}

/** A two-tape {0ⁿ1ⁿ | n ≥ 0}: copy the 0s to tape 2, then match the 1s against them walking back — linear time. */
const twoTapeZerosOnes: TuringMachine = {
  states: ['p0', 'p1', 'pa'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    tk('p0', ['0', 'B'], 'p0', ['0', '0'], ['R', 'R']),
    tk('p0', ['1', 'B'], 'p1', ['1', 'B'], ['S', 'L']),
    tk('p0', ['B', 'B'], 'pa', ['B', 'B'], ['S', 'S']),
    tk('p1', ['1', '0'], 'p1', ['1', '0'], ['R', 'L']),
    tk('p1', ['B', 'B'], 'pa', ['B', 'B'], ['S', 'S']),
  ],
  start: 'p0',
  accepting: ['pa'],
  tapes: 2,
}

const trackInput = (word: string): Sym[] => [...word].map((c) => `B|${c}`)

export const TM_PRESETS: TmPreset[] = [
  {
    id: 'zeros-ones',
    title: '0ⁿ1ⁿ — Fig. 8.9',
    blurb: 'Change a 0 to X, find a 1 and change it to Y, walk back; accept when only Ys remain. The book’s worked example, ID for ID.',
    machine: zerosOnes,
    technique: 'basic',
    citation: '8.2.3, Example 8.2',
    suggested: ['0011', '0010', '000111', '01', ''],
    expected: [
      { input: '0011', accepted: true, maxMoves: 13 },
      { input: '0010', accepted: false, maxMoves: 8 },
      { input: '000111', accepted: true, maxMoves: 40 },
    ],
  },
  {
    id: 'monus',
    title: 'Proper subtraction — Fig. 8.11',
    blurb: '0ᵐ10ⁿ becomes 0ᵐ⁻ⁿ, or a blank tape when n ≥ m: Turing’s original view of the machine as a computer of functions.',
    machine: monus,
    technique: 'function',
    citation: '8.2.4, Example 8.4',
    suggested: ['0010', '00010', '0100', '01'],
    expected: [
      { input: '0010', accepted: true, output: '0', maxMoves: 40 },
      { input: '00010', accepted: true, output: '00', maxMoves: 60 },
      { input: '0100', accepted: true, output: '', maxMoves: 40 },
    ],
  },
  {
    id: 'binary-increment',
    title: 'Binary increment — Exercise 8.2.3',
    blurb: '$N becomes N+1 with the head on its leftmost digit: walk to the end, carry leftwards, destroy the $.',
    machine: binaryIncrement,
    technique: 'function',
    citation: '8.2.7, Exercise 8.2.3',
    suggested: ['$10011', '$111', '$0', '$1011'],
    expected: [
      { input: '$10011', accepted: true, output: '10100', maxMoves: 30 },
      { input: '$111', accepted: true, output: '1000', maxMoves: 20 },
      { input: '$0', accepted: true, output: '1', maxMoves: 10 },
    ],
  },
  {
    id: 'unary-add',
    title: 'Unary addition',
    blurb: '0ᵐ10ⁿ becomes 0ᵐ⁺ⁿ: the separator turns into a 0 and the last 0 is erased.',
    machine: unaryAdd,
    technique: 'function',
    citation: '8.2.4',
    suggested: ['00100', '0001', '100'],
    expected: [
      { input: '00100', accepted: true, output: '0000', maxMoves: 12 },
      { input: '0001', accepted: true, output: '000', maxMoves: 10 },
    ],
  },
  {
    id: 'palindrome',
    title: 'Palindromes over {0, 1}',
    blurb: 'Remember the first symbol, erase it, check the last symbol matches, erase it, repeat from the middle out.',
    machine: palindrome,
    technique: 'basic',
    citation: '8.2.7, Exercise 8.2.2',
    suggested: ['0110', '010', '01', '', '1001'],
    expected: [
      { input: '0110', accepted: true, maxMoves: 30 },
      { input: '010', accepted: true, maxMoves: 20 },
      { input: '01', accepted: false, maxMoves: 10 },
    ],
  },
  {
    id: 'anbncn',
    title: 'aⁿbⁿcⁿ — Exercise 8.2.2',
    blurb: 'Not context-free, but one tape and three marker symbols suffice: mark an a, a b and a c per round.',
    machine: anbncn,
    technique: 'basic',
    citation: '8.2.7, Exercise 8.2.2',
    suggested: ['aabbcc', 'abc', 'aabc', 'aabbc'],
    expected: [
      { input: 'aabbcc', accepted: true, maxMoves: 60 },
      { input: 'abc', accepted: true, maxMoves: 20 },
      { input: 'aabc', accepted: false, maxMoves: 30 },
    ],
  },
  {
    id: 'copy',
    title: 'Copy — Fig. 8.14',
    blurb: '10ⁿ becomes 10ⁿ10ⁿ: the subroutine the multiplication program calls, run on its own. q₀ walks over the leading 1.',
    machine: copy,
    technique: 'subroutine',
    citation: '8.3.3, Example 8.8',
    suggested: ['1001', '101', '100001'],
    expected: [
      { input: '1001', accepted: true, output: '100100', maxMoves: 40 },
      { input: '101', accepted: true, output: '1010', maxMoves: 20 },
    ],
    subroutine: { name: 'Copy', states: ['q1', 'q2', 'q3', 'q4', 'q5'] },
  },
  {
    id: 'multiply',
    title: 'Multiplication — Fig. 8.15',
    blurb: '0ᵐ10ⁿ1 becomes 0ᵐⁿ, by calling Copy once per 0 of the first block and then erasing the leading 10ⁿ1.',
    machine: multiply,
    technique: 'subroutine',
    citation: '8.3.3, Example 8.8',
    suggested: ['001001', '01001', '0001001'],
    expected: [
      { input: '001001', accepted: true, output: '0000', maxMoves: 200 },
      { input: '01001', accepted: true, output: '00', maxMoves: 80 },
    ],
    subroutine: { name: 'Copy', states: ['q1', 'q2', 'q3', 'q4', 'q5'] },
  },
  {
    id: 'busy-beaver-2',
    title: '2-state busy beaver',
    blurb: 'On a blank tape (the blank is 0 here), the most 1s two states can write and still halt: four, in six moves.',
    machine: busyBeaver2,
    technique: 'busy-beaver',
    citation: '8.2.6',
    suggested: [''],
    expected: [{ input: '', accepted: true, output: '1111', maxMoves: 6 }],
  },
  {
    id: 'busy-beaver-3',
    title: '3-state busy beaver',
    blurb: 'Three states, six 1s in 14 moves — and no three-state machine that halts writes more.',
    machine: busyBeaver3,
    technique: 'busy-beaver',
    citation: '8.2.6',
    suggested: [''],
    expected: [{ input: '', accepted: true, output: '111111', maxMoves: 14 }],
  },
  {
    id: 'never-halts',
    title: 'A machine that does not halt',
    blurb: 'On an input starting with 0 it accepts at once; on one starting with 1 it moves right forever. Nothing is wrong with it — that is §8.2.6.',
    machine: neverHalts,
    technique: 'basic',
    citation: '8.2.6',
    suggested: ['1', '0', '10'],
    expected: [{ input: '0', accepted: true, maxMoves: 1 }],
    nonHalting: { inputs: 'any input beginning with 1', why: 'q₁ moves right on every symbol, including the blank, and never leaves.' },
  },
  {
    id: 'storage-in-state',
    title: 'Storage in the state — Example 8.6',
    blurb: 'Accepts 01* + 10*. The state is a pair [control, stored symbol]: the first symbol read is remembered in the finite control.',
    machine: storageInState,
    technique: 'storage',
    citation: '8.3.1, Example 8.6',
    suggested: ['0111', '1000', '0110', '1'],
    expected: [
      { input: '0111', accepted: true, maxMoves: 5 },
      { input: '0110', accepted: false, maxMoves: 5 },
    ],
  },
  {
    id: 'tracks',
    title: 'Multiple tracks — Example 8.7',
    blurb: 'Accepts wcw. A second track holds check marks: each cell is mark|symbol, and the state remembers the symbol being matched.',
    machine: tracks,
    technique: 'tracks',
    citation: '8.3.2, Example 8.7',
    suggested: ['01c01', '0c0', '01c10', 'c'],
    expected: [
      { input: '01c01', accepted: true, maxMoves: 40 },
      { input: '01c10', accepted: false, maxMoves: 40 },
    ],
    encodeInput: trackInput,
  },
  {
    id: 'ntm',
    title: 'A nondeterministic machine — Exercise 8.4.2',
    blurb: 'In q₁ the machine may keep moving right or turn back: the branch tree is the set of IDs the exercise asks for.',
    machine: ntm,
    technique: 'nondeterministic',
    citation: '8.4.4, Exercise 8.4.2',
    suggested: ['01', '011', '1'],
    expected: [
      { input: '01', accepted: true, maxMoves: 6 },
      { input: '011', accepted: true, maxMoves: 12 },
    ],
  },
  {
    id: 'two-tape-zeros-ones',
    title: '0ⁿ1ⁿ on two tapes',
    blurb: 'Copy the 0s to the second tape, then cancel the 1s against them walking back: linear time, where one tape needs a quadratic number of moves.',
    machine: twoTapeZerosOnes,
    technique: 'multitape',
    citation: '8.4.1',
    suggested: ['0011', '001', '', '000111'],
    expected: [
      { input: '0011', accepted: true, maxMoves: 6 },
      { input: '001', accepted: false, maxMoves: 6 },
      { input: '', accepted: true, maxMoves: 1 },
    ],
  },
]

export function tmPreset(id: string): TmPreset | undefined {
  return TM_PRESETS.find((p) => p.id === id)
}
