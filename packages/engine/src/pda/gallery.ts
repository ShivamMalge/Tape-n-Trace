/**
 * The PDA gallery — the machines Module 3 is taught from.
 *
 * Each is written exactly as Hopcroft 2e writes it: transitions always pop
 * (the `pop: null` JFLAP shorthand appears nowhere here), the bottom marker is
 * Z0, and wwᴿ is Example 6.2 arc for arc. wcwᴿ is its deterministic cousin so
 * the DPDA checker has one machine that passes and one that fails on the same
 * language idea (§6.4).
 */

import { pdaTransitionId } from '../ids.js'
import type { PDA, PDATransition, Read, StateId, Sym } from '../types.js'

export interface PdaPreset {
  id: string
  title: string
  /** One sentence, exam language. */
  blurb: string
  machine: PDA
  /** Strings worth trying, accepted first. */
  suggested: string[]
  citation: string
  deterministic: boolean
}

function t(from: StateId, read: Read, pop: Read, push: Sym[], to: StateId): PDATransition {
  return { id: pdaTransitionId(from, read, pop, push, to), from, read, pop, to, push }
}

const anbn: PDA = {
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['a', 'b'],
  stackAlphabet: ['Z0', 'A'],
  transitions: [
    t('q0', 'a', 'Z0', ['A', 'Z0'], 'q0'),
    t('q0', 'a', 'A', ['A', 'A'], 'q0'),
    t('q0', 'b', 'A', [], 'q1'),
    t('q1', 'b', 'A', [], 'q1'),
    t('q0', null, 'Z0', ['Z0'], 'q2'),
    t('q1', null, 'Z0', ['Z0'], 'q2'),
  ],
  start: 'q0',
  startStack: 'Z0',
  accepting: ['q2'],
  acceptBy: 'finalState',
  layout: { q0: { x: 80, y: 100 }, q1: { x: 260, y: 100 }, q2: { x: 440, y: 100 } },
}

const wwr: PDA = {
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['0', '1'],
  stackAlphabet: ['Z0', '0', '1'],
  transitions: [
    t('q0', '0', 'Z0', ['0', 'Z0'], 'q0'),
    t('q0', '1', 'Z0', ['1', 'Z0'], 'q0'),
    t('q0', '0', '0', ['0', '0'], 'q0'),
    t('q0', '0', '1', ['0', '1'], 'q0'),
    t('q0', '1', '0', ['1', '0'], 'q0'),
    t('q0', '1', '1', ['1', '1'], 'q0'),
    t('q0', null, 'Z0', ['Z0'], 'q1'),
    t('q0', null, '0', ['0'], 'q1'),
    t('q0', null, '1', ['1'], 'q1'),
    t('q1', '0', '0', [], 'q1'),
    t('q1', '1', '1', [], 'q1'),
    t('q1', null, 'Z0', ['Z0'], 'q2'),
  ],
  start: 'q0',
  startStack: 'Z0',
  accepting: ['q2'],
  acceptBy: 'finalState',
  layout: { q0: { x: 80, y: 100 }, q1: { x: 260, y: 100 }, q2: { x: 440, y: 100 } },
}

const wcwr: PDA = {
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['0', '1', 'c'],
  stackAlphabet: ['Z0', '0', '1'],
  transitions: [
    t('q0', '0', 'Z0', ['0', 'Z0'], 'q0'),
    t('q0', '1', 'Z0', ['1', 'Z0'], 'q0'),
    t('q0', '0', '0', ['0', '0'], 'q0'),
    t('q0', '0', '1', ['0', '1'], 'q0'),
    t('q0', '1', '0', ['1', '0'], 'q0'),
    t('q0', '1', '1', ['1', '1'], 'q0'),
    t('q0', 'c', 'Z0', ['Z0'], 'q1'),
    t('q0', 'c', '0', ['0'], 'q1'),
    t('q0', 'c', '1', ['1'], 'q1'),
    t('q1', '0', '0', [], 'q1'),
    t('q1', '1', '1', [], 'q1'),
    t('q1', null, 'Z0', ['Z0'], 'q2'),
  ],
  start: 'q0',
  startStack: 'Z0',
  accepting: ['q2'],
  acceptBy: 'finalState',
  layout: { q0: { x: 80, y: 100 }, q1: { x: 260, y: 100 }, q2: { x: 440, y: 100 } },
}

const balanced: PDA = {
  states: ['q0'],
  inputAlphabet: ['(', ')'],
  stackAlphabet: ['Z0', 'P'],
  transitions: [
    t('q0', '(', 'Z0', ['P', 'Z0'], 'q0'),
    t('q0', '(', 'P', ['P', 'P'], 'q0'),
    t('q0', ')', 'P', [], 'q0'),
    t('q0', null, 'Z0', [], 'q0'),
  ],
  start: 'q0',
  startStack: 'Z0',
  accepting: [],
  acceptBy: 'emptyStack',
  layout: { q0: { x: 200, y: 100 } },
}

export const PDA_PRESETS: PdaPreset[] = [
  {
    id: 'anbn',
    title: 'aⁿbⁿ — the matched count',
    blurb: 'Push an A for every a, pop one for every b; the stack is the counter no finite automaton has.',
    machine: anbn,
    suggested: ['aaabbb', 'ab', '', 'aab', 'ba'],
    citation: '6.1.4',
    deterministic: false,
  },
  {
    id: 'wwr',
    title: 'wwᴿ — even palindromes',
    blurb: 'The machine guesses the middle of the input — Example 6.2, and the branch tree shows every guess.',
    machine: wwr,
    suggested: ['0110', '1001', '01', '010'],
    citation: '6.1.2, Example 6.2',
    deterministic: false,
  },
  {
    id: 'wcwr',
    title: 'wcwᴿ — palindromes with a centre mark',
    blurb: 'The c announces the middle, so nothing is guessed: this one is a DPDA.',
    machine: wcwr,
    suggested: ['01c10', 'c', '0c0', '01c01'],
    citation: '6.4.1, Fig 6.11',
    deterministic: true,
  },
  {
    id: 'balanced-parens',
    title: 'Balanced parentheses — empty-stack acceptance',
    blurb: 'No accepting state at all: the machine accepts by emptying its stack, N(P) rather than L(P).',
    machine: balanced,
    suggested: ['(())()', '()', '', '(()', ')('],
    citation: '6.2.2',
    deterministic: false,
  },
]

export function pdaPreset(id: string): PdaPreset | undefined {
  return PDA_PRESETS.find((p) => p.id === id)
}
