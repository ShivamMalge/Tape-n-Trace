/**
 * The CFL closure lab's presets, operations and small helpers — plain data,
 * kept apart from the component so the page stays readable.
 */

import {
  cfgToPDA,
  emptyStackToFinalState,
  generatedStrings,
  isOk,
  parseGrammar,
  unwrap,
} from '@tape-n-trace/engine'
import type { CFG, FiniteAutomaton, PDA } from '@tape-n-trace/engine'

export interface CflPreset {
  id: string
  title: string
  grammar: CFG
}

export const CFL_PRESETS: CflPreset[] = [
  { id: 'anbn', title: 'aⁿbⁿ (n ≥ 1)', grammar: unwrap(parseGrammar('S -> a S b | a b')) },
  { id: 'bplus', title: 'b⁺', grammar: unwrap(parseGrammar('S -> b S | b')) },
  { id: 'palindromes', title: 'Palindromes over {a, b}', grammar: unwrap(parseGrammar('S -> a S a | b S b | a | b | ε')) },
  { id: 'even-a', title: '(ab)ⁿ (n ≥ 1)', grammar: unwrap(parseGrammar('S -> a b S | a b')) },
]

export const DFA_PRESETS: { id: string; title: string; machine: FiniteAutomaton }[] = [
  {
    id: 'even-as',
    title: 'an even number of a’s',
    machine: {
      kind: 'DFA',
      states: ['e', 'o'],
      alphabet: ['a', 'b'],
      transitions: [
        { id: 'e-[a]->o', from: 'e', read: 'a', to: 'o' },
        { id: 'e-[b]->e', from: 'e', read: 'b', to: 'e' },
        { id: 'o-[a]->e', from: 'o', read: 'a', to: 'e' },
        { id: 'o-[b]->o', from: 'o', read: 'b', to: 'o' },
      ],
      start: 'e',
      accepting: ['e'],
      layout: { e: { x: 80, y: 80 }, o: { x: 240, y: 80 } },
    },
  },
  {
    id: 'ends-in-b',
    title: 'strings ending in b',
    machine: {
      kind: 'DFA',
      states: ['p', 'q'],
      alphabet: ['a', 'b'],
      transitions: [
        { id: 'p-[a]->p', from: 'p', read: 'a', to: 'p' },
        { id: 'p-[b]->q', from: 'p', read: 'b', to: 'q' },
        { id: 'q-[a]->p', from: 'q', read: 'a', to: 'p' },
        { id: 'q-[b]->q', from: 'q', read: 'b', to: 'q' },
      ],
      start: 'p',
      accepting: ['q'],
      layout: { p: { x: 80, y: 80 }, q: { x: 240, y: 80 } },
    },
  },
]

export type Op = 'union' | 'concat' | 'star' | 'reverse' | 'homomorphism' | 'substitution' | 'intersection' | 'inverse-homomorphism'

export const OPS: { id: Op; title: string; citation: string; arity: 1 | 2; kind: 'grammar' | 'pda' }[] = [
  { id: 'union', title: 'Union', citation: '§7.3.2, Thm 7.24', arity: 2, kind: 'grammar' },
  { id: 'concat', title: 'Concatenation', citation: '§7.3.2, Thm 7.24', arity: 2, kind: 'grammar' },
  { id: 'star', title: 'Closure (*)', citation: '§7.3.2, Thm 7.24', arity: 1, kind: 'grammar' },
  { id: 'reverse', title: 'Reversal', citation: '§7.3.3, Thm 7.25', arity: 1, kind: 'grammar' },
  { id: 'homomorphism', title: 'Homomorphism', citation: '§7.3.2, Thm 7.24', arity: 1, kind: 'grammar' },
  { id: 'substitution', title: 'Substitution (Example 7.22)', citation: '§7.3.1, Thm 7.23', arity: 1, kind: 'grammar' },
  { id: 'intersection', title: 'Intersection with a regular language', citation: '§7.3.4, Thm 7.27', arity: 1, kind: 'pda' },
  { id: 'inverse-homomorphism', title: 'Inverse homomorphism', citation: '§7.3.5, Thm 7.30', arity: 1, kind: 'pda' },
]

export const SUBSTITUTION_DEMO = {
  base: unwrap(parseGrammar('S -> 0 1')),
  images: {
    '0': unwrap(parseGrammar('S -> a S b | a b')),
    '1': unwrap(parseGrammar('S -> a a | b b')),
  },
}

export function finalStatePda(grammar: CFG): PDA | null {
  const byEmpty = cfgToPDA(grammar)
  if (!isOk(byEmpty) || byEmpty.value.result.type !== 'machine') return null
  const byFinal = emptyStackToFinalState(byEmpty.value.result.machine as PDA)
  if (!isOk(byFinal) || byFinal.value.result.type !== 'machine') return null
  return byFinal.value.result.machine as PDA
}

export const shortest = (grammar: CFG, n = 8): string[] =>
  [...generatedStrings(grammar, 6)].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, n)

export const verdict = (v: boolean | null): string => (v === null ? '—' : v ? 'accepts' : 'rejects')

export function runDfa(dfa: FiniteAutomaton, word: string): string | null {
  let state: string | null = dfa.start
  for (const symbol of word) {
    const move = dfa.transitions.find((t) => t.from === state && t.read === symbol)
    if (move === undefined) return null
    state = move.to
  }
  return state
}

export const chip = (on: boolean): React.CSSProperties => ({
  fontSize: 13,
  padding: '3px 10px',
  borderRadius: 999,
  border: on ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
  background: on ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  cursor: 'pointer',
})

export const field: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 14,
  padding: '4px 8px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  width: 90,
}
