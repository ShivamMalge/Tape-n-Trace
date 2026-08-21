/**
 * The divisible-by-K family — generated, not hand-written.
 *
 * phases.md P1.1: "Divisible-by-K exercises are generated from the P0.2 preset
 * family over base and divisor, not hand-written one at a time." The bank asks
 * this shape repeatedly (#3(ii), #5, #15 and the model papers), so the family is
 * one generator over (base, divisor) with the residue-class machine as its own
 * reference — which is also why every reference is correct by construction.
 */

import { divisibleBy } from '@tape-n-trace/engine'
import type { Exercise } from '../../lib/exercises'

interface Variant {
  base: number
  divisor: number
  /** The bank or paper question this instance corresponds to, where one exists. */
  source: string
}

const VARIANTS: Variant[] = [
  { base: 10, divisor: 3, source: 'Question Bank #3(ii)' },
  { base: 10, divisor: 5, source: 'Question Bank #5' },
  { base: 10, divisor: 4, source: 'Question Bank #15' },
  { base: 10, divisor: 2, source: 'Generated — QB #3/#5 family' },
  { base: 10, divisor: 6, source: 'Generated — QB #3/#5 family' },
  { base: 2, divisor: 3, source: 'Generated — QB #3/#5 family' },
  { base: 2, divisor: 5, source: 'Generated — QB #3/#5 family' },
  { base: 3, divisor: 4, source: 'Generated — QB #3/#5 family' },
]

function baseName(base: number): string {
  return base === 10 ? 'decimal' : base === 2 ? 'binary' : `base-${base}`
}

export const GENERATED: Exercise[] = VARIANTS.map(({ base, divisor, source }) => ({
  id: `gen-div-${base}-${divisor}`,
  topic: 'fa.dfa',
  prompt: `Construct a DFA accepting ${baseName(base)} strings whose value is divisible by ${divisor}.`,
  kind: 'construct-dfa',
  reference: { kind: 'machine', machine: divisibleBy(divisor, base) },
  grader: 'language-equivalence',
  hints: [
    `Each state is a remainder mod ${divisor} — you never need to know the number, only its residue.`,
    `Reading digit d in state r moves to (r × ${base} + d) mod ${divisor}, because appending a digit multiplies by the base and adds.`,
    'The start state is residue 0, which is also the accepting state.',
  ],
  marks: 8,
  bloom: 'CL3',
  co: 'CO1',
  part: 'b',
  source,
}))
