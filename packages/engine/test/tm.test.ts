/**
 * Turing machines — phases.md P1.6.
 *
 * The ID notation is held to Example 8.2 character for character; every
 * gallery machine is held to its documented output and move bound; the
 * multitape reduction is held to language equivalence on an exhaustive sample
 * and to Theorem 8.10's move bound; the step guard is held to honesty.
 */

import { describe, expect, it } from 'vitest'
import {
  TM_PRESETS,
  encodeInput,
  finalConfig,
  isDeterministicTM,
  movesMade,
  multitapeToSingle,
  simulateReduction,
  simulateTM,
  stateText,
  tapeContents,
  tmIdLog,
  tmPreset,
  unwrap,
  isErr,
} from '../src/index.js'
import type { Step, Sym, TmSnapshot, TuringMachine } from '../src/index.js'
import { allStringsUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

function preset(id: string): NonNullable<ReturnType<typeof tmPreset>> {
  const found = tmPreset(id)
  if (found === undefined) throw new Error(`no preset ${id}`)
  return found
}

const run = (machine: TuringMachine, input: string | Sym[], maxSteps?: number) =>
  unwrap(simulateTM(machine, input, maxSteps === undefined ? {} : { maxSteps }))

describe('the ID notation — §8.2.3', () => {
  it('writes states as the book typesets them', () => {
    expect(stateText('q0')).toBe('q₀')
    expect(stateText('q12')).toBe('q₁₂')
    expect(stateText('qf')).toBe('qf')
    expect(stateText('[q1,0]')).toBe('[q1,0]')
  })

  it('Example 8.2 on 0011: the accepting computation, character for character', () => {
    const trace = run(preset('zeros-ones').machine, '0011')
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: true })
    expect(tmIdLog(trace)).toBe(
      'q₀0011 ⊢ Xq₁011 ⊢ X0q₁11 ⊢ Xq₂0Y1 ⊢ q₂X0Y1 ⊢ Xq₀0Y1 ⊢ XXq₁Y1 ⊢ XXYq₁1 ⊢ XXq₂YY ⊢ Xq₂XYY ⊢ XXq₀YY ⊢ XXYq₃Y ⊢ XXYYq₃B ⊢ XXYYBq₄B',
    )
    expect(movesMade(trace)).toBe(13)
  })

  it('Example 8.2 on 0010: dies in q₁ scanning a blank, exactly as printed', () => {
    const trace = run(preset('zeros-ones').machine, '0010')
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false })
    expect(tmIdLog(trace)).toBe('q₀0010 ⊢ Xq₁010 ⊢ X0q₁10 ⊢ Xq₂0Y0 ⊢ q₂X0Y0 ⊢ Xq₀0Y0 ⊢ XXq₁Y0 ⊢ XXYq₁0 ⊢ XXY0q₁B')
    expect(movesMade(trace)).toBe(8)
  })
})

describe('the gallery halts with its documented output within its documented moves', () => {
  const cases = TM_PRESETS.flatMap((p) => p.expected.map((e) => ({ id: p.id, ...e })))

  it.each(cases)('$id on "$input"', ({ id, input, accepted, output, maxMoves }) => {
    const p = preset(id)
    const symbols = p.encodeInput === undefined ? input : p.encodeInput(input)
    const trace = run(p.machine, symbols)
    assertTraceInvariants(trace)
    expect(trace.result.type, 'the run reached a verdict').toBe('acceptance')
    if (trace.result.type === 'acceptance') expect(trace.result.accepted).toBe(accepted)
    expect(movesMade(trace)).toBeLessThanOrEqual(maxMoves)
    if (output !== undefined) {
      const config = finalConfig(trace)
      expect(tapeContents(config.tapes[0] as NonNullable<(typeof config.tapes)[0]>, p.machine.blank)).toBe(output)
    }
  })

  it('the busy beavers make exactly their famous move counts', () => {
    expect(movesMade(run(preset('busy-beaver-2').machine, ''))).toBe(6)
    expect(movesMade(run(preset('busy-beaver-3').machine, ''))).toBe(14)
  })

  it('every preset is well-formed, and the nondeterministic one is the only NTM', () => {
    for (const p of TM_PRESETS) {
      expect(isDeterministicTM(p.machine), p.id).toBe(p.technique !== 'nondeterministic')
    }
  })
})

describe('language presets, checked on every short string', () => {
  it('storage in the state accepts exactly 01* + 10*', () => {
    const m = preset('storage-in-state').machine
    for (const word of allStringsUpTo(['0', '1'], 6)) {
      const w = word.join('')
      const trace = run(m, w)
      expect(trace.result).toMatchObject({ type: 'acceptance', accepted: /^(01*|10*)$/.test(w) })
    }
  })

  it('the two-track machine accepts exactly wcw', () => {
    const p = preset('tracks')
    const encode = p.encodeInput as NonNullable<typeof p.encodeInput>
    for (const word of allStringsUpTo(['0', '1', 'c'], 5)) {
      const w = word.join('')
      const parts = w.split('c')
      const expected = parts.length === 2 && parts[0] === parts[1] && (parts[0] as string).length > 0
      const trace = run(p.machine, encode(w))
      expect(trace.result, w).toMatchObject({ type: 'acceptance', accepted: expected })
    }
  })

  it('palindromes and aⁿbⁿcⁿ', () => {
    const pal = preset('palindrome').machine
    for (const word of allStringsUpTo(['0', '1'], 6)) {
      const w = word.join('')
      expect(run(pal, w).result, w).toMatchObject({ accepted: w === [...w].reverse().join('') })
    }
    const abc = preset('anbncn').machine
    for (const word of allStringsUpTo(['a', 'b', 'c'], 6)) {
      const w = word.join('')
      const n = w.length / 3
      const expected = Number.isInteger(n) && n >= 1 && w === 'a'.repeat(n) + 'b'.repeat(n) + 'c'.repeat(n)
      expect(run(abc, w).result, w).toMatchObject({ accepted: expected })
    }
  })
})

describe('nondeterminism — §8.4.4', () => {
  it('Exercise 8.4.2 on 01: the branch tree holds the reachable IDs and accepts', () => {
    const trace = run(preset('ntm').machine, '01')
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ accepted: true })
    const nodes = (trace.steps.at(-1) as Step<TmSnapshot>).snapshot.nodes
    expect(nodes.length).toBeGreaterThan(3)
    expect(tmIdLog(trace)).toBe('q₀01 ⊢ 1q₀1 ⊢ 10q₁B ⊢ 10Bq₂B')
  })
})

describe('the step guard — §8.2.6 made honest', () => {
  it('stops the non-halting machine at the cap, reports incomplete, and continues on request', () => {
    const m = preset('never-halts').machine
    const trace = run(m, '1', 50)
    assertTraceInvariants(trace)
    expect(trace.result.type).toBe('incomplete')
    expect((trace.steps.at(-1) as Step<TmSnapshot>).snapshot.status).toBe('stopped')
    expect(trace.meta.truncated?.reason).toContain('without halting')

    // "Continue for N more": the same run with a larger cap gets further and is still honest.
    const more = run(m, '1', 150)
    expect(more.result.type).toBe('incomplete')
    expect(movesMade(more)).toBeGreaterThan(movesMade(trace))
    expect(movesMade(more)).toBe(150)
  })

  it('the same machine halts at once on the other input', () => {
    const trace = run(preset('never-halts').machine, '0')
    expect(trace.result).toMatchObject({ accepted: true })
    expect(movesMade(trace)).toBe(1)
  })
})

describe('validation', () => {
  it('refuses a single-tape machine whose head stays put, and an input symbol equal to the blank', () => {
    const bad: TuringMachine = {
      ...preset('zeros-ones').machine,
      inputAlphabet: ['0', '1', 'B'],
      transitions: [{ id: 'stay', from: 'q0', read: ['0'], to: 'q0', write: ['0'], move: ['S'] }],
    }
    const result = simulateTM(bad, '0')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('TM_STATIONARY')
    expect(codes).toContain('TM_BLANK_IS_INPUT')
  })
})

describe('many tapes to one — Theorems 8.9 and 8.10', () => {
  const two = preset('two-tape-zeros-ones').machine

  it('the reduction accepts the same strings as the two-tape machine, every string to length 6', () => {
    const single = unwrap(multitapeToSingle(two))
    expect(single.tapes).toBe(1)
    expect(isDeterministicTM(single)).toBe(true)

    let checked = 0
    for (const word of allStringsUpTo(['0', '1'], 6)) {
      const expected = run(two, word.join('')).result
      const got = run(single, encodeInput(two, word)).result
      expect(got, word.join('')).toMatchObject({ type: 'acceptance', accepted: (expected as { accepted: boolean }).accepted })
      checked++
    }
    expect(checked).toBeGreaterThanOrEqual(100)
  })

  it('N simulates each move of M within 4n + 2k moves, and the lockstep trace counts them', { timeout: 60_000 }, () => {
    const trace = unwrap(simulateReduction(two, '0011'))
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ accepted: true })

    const last = trace.steps.at(-1)?.snapshot
    expect(last?.mMoves).toBe(movesMade(run(two, '0011')))
    const n = last?.mMoves as number
    const k = 2
    let bound = 0
    for (let i = 1; i <= n; i++) bound += 4 * i + 2 * k
    // Plus the turn-around the sweep needs, two moves per simulated move.
    expect(last?.nMoves as number).toBeLessThanOrEqual(bound + 2 * n)
    expect(last?.nMoves as number).toBeGreaterThan(n)
  })

  it('refuses a machine that already has one tape', () => {
    const result = multitapeToSingle(preset('zeros-ones').machine)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.code).toBe('TM_ALREADY_SINGLE')
  })
})

describe('a machine that returns to an earlier ID — it loops, it does not reject', () => {
  const tm = (transitions: [string, string, string, string, 'L' | 'R' | 'S'][]): TuringMachine => ({
    states: ['q0', 'q1', 'q2'],
    inputAlphabet: ['0'],
    tapeAlphabet: ['0', 'B'],
    blank: 'B',
    tapes: 1,
    start: 'q0',
    accepting: ['q2'],
    transitions: transitions.map(([from, read, to, write, move]) => ({
      id: `${from}-${read}->${to}`,
      from,
      to,
      read: [read],
      write: [write],
      move: [move],
    })),
  })

  it('reports a machine standing still in place as never halting', () => {
    const trace = run(tm([['q0', 'B', 'q0', 'B', 'R']]), '')
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false, loops: true })
  })

  it('reports a two-state back-and-forth as never halting', () => {
    const trace = run(tm([['q0', '0', 'q1', '0', 'R'], ['q1', 'B', 'q0', 'B', 'L']]), '0')
    expect(trace.result).toMatchObject({ accepted: false, loops: true })
    expect(trace.steps.at(-1)?.snapshot.status).toBe('loops')
  })

  it('still rejects a machine that really halts', () => {
    const trace = run(tm([['q0', '0', 'q1', '0', 'R']]), '0')
    expect(trace.result).toMatchObject({ accepted: false })
    expect(trace.result).not.toHaveProperty('loops')
  })
})

describe('regressions — the search over IDs', () => {
  type Row = [string, string, string, string, 'L' | 'R']
  const machine = (states: string[], input: string[], rows: Row[]): TuringMachine => ({
    states,
    inputAlphabet: input,
    tapeAlphabet: [...input, 'B'],
    blank: 'B',
    tapes: 1,
    start: states[0] as string,
    accepting: ['acc'],
    transitions: rows.map(([from, read, to, write, move], n) => ({ id: `t${n}`, from, read: [read], to, write: [write], move: [move] })),
  })

  it('finds a loop that runs through an ID first reached by another branch', () => {
    // n0 → a → c and n0 → b → c, then c → b: b ⊢ c ⊢ b ⊢ … forever, though no single
    // path of the breadth-first tree repeats an ID. No branch halts at all.
    const m = machine(['q0', 'a', 'b', 'c', 'acc'], ['0'], [
      ['q0', 'B', 'a', 'B', 'R'],
      ['q0', 'B', 'b', 'B', 'R'],
      ['a', 'B', 'c', 'B', 'L'],
      ['b', 'B', 'c', 'B', 'L'],
      ['c', 'B', 'b', 'B', 'R'],
    ])
    const trace = run(m, '')
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false, loops: true })
  })

  it('does not merge two configurations whose IDs happen to be spelled alike', () => {
    // State p on 1x and state p1 on x both write "p1x". Only p can accept.
    const m = machine(['s', 'm', 'm2', 'p1', 'n', 'n2', 'n3', 'p', 'acc'], ['1', 'x'], [
      ['s', '1', 'm', 'B', 'R'],
      ['m', 'x', 'm2', 'x', 'L'],
      ['m2', 'B', 'p1', 'B', 'R'],
      ['s', '1', 'n', '1', 'R'],
      ['n', 'x', 'n2', 'x', 'R'],
      ['n2', 'B', 'n3', 'B', 'L'],
      ['n3', 'x', 'p', 'x', 'L'],
      ['p', '1', 'acc', '1', 'R'],
    ])
    expect(run(m, '1x').result).toMatchObject({ type: 'acceptance', accepted: true })
  })

  it('names a state the machine really halted in when it rejects', () => {
    // Two branches meet at an ID; the rejection note must name the halting state, not the merged branch.
    // The halting branch is q0 ⊢ a ⊢ c; the longer q0 ⊢ b ⊢ b2 ⊢ b3 reaches c again and is cut there.
    const m = machine(['q0', 'a', 'b', 'b2', 'b3', 'c', 'acc'], ['0'], [
      ['q0', 'B', 'a', 'B', 'R'],
      ['q0', 'B', 'b', 'B', 'R'],
      ['a', 'B', 'c', 'B', 'L'],
      ['b', 'B', 'b2', 'B', 'R'],
      ['b2', 'B', 'b3', 'B', 'R'],
      ['b3', 'B', 'c', 'B', 'L'],
    ])
    const trace = run(m, '')
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ accepted: false })
    expect(trace.result).not.toHaveProperty('loops')
    if (trace.result.type === 'acceptance') expect(trace.result.note).toContain('Halted in c ')
  })
})

describe('regressions — many tapes to one', () => {
  const twoTape = (transitions: TuringMachine['transitions'], extra: Partial<TuringMachine> = {}): TuringMachine => ({
    states: ['q0', 'q1', 'acc'],
    inputAlphabet: ['0'],
    tapeAlphabet: ['0', 'B'],
    blank: 'B',
    tapes: 2,
    start: 'q0',
    accepting: ['acc'],
    transitions,
    ...extra,
  })
  const accepts = (m: TuringMachine, w: string): boolean => {
    const result = run(m, w).result
    return result.type === 'acceptance' && result.accepted
  }

  it('keeps every move of a nondeterministic M, so N accepts what M accepts', () => {
    const m = twoTape([
      { id: 'a', from: 'q0', read: ['0', 'B'], to: 'q1', write: ['0', 'B'], move: ['R', 'S'] },
      { id: 'b', from: 'q0', read: ['0', 'B'], to: 'acc', write: ['0', 'B'], move: ['R', 'S'] },
    ])
    expect(accepts(m, '0')).toBe(true)
    expect(accepts(unwrap(multitapeToSingle(m)), encodeInput(m, '0') as unknown as string)).toBe(true)
  })

  it('halts N in a rejecting state of M, as M halts there', () => {
    const m = twoTape(
      [
        { id: 'a', from: 'q0', read: ['0', 'B'], to: 'q1', write: ['0', 'B'], move: ['R', 'S'] },
        { id: 'c', from: 'q1', read: ['B', 'B'], to: 'acc', write: ['B', 'B'], move: ['S', 'S'] },
      ],
      { rejecting: ['q1'] },
    )
    expect(accepts(m, '0')).toBe(false)
    expect(accepts(unwrap(multitapeToSingle(m)), encodeInput(m, '0') as unknown as string)).toBe(false)
  })

  it('reports an M that never halts as looping, not as rejecting', () => {
    const m = twoTape([
      { id: 'a', from: 'q0', read: ['B', 'B'], to: 'q1', write: ['B', 'B'], move: ['R', 'S'] },
      { id: 'b', from: 'q1', read: ['B', 'B'], to: 'q0', write: ['B', 'B'], move: ['L', 'S'] },
    ])
    const trace = unwrap(simulateReduction(m, ''))
    assertTraceInvariants(trace)
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false, loops: true })
    expect(trace.steps.at(-1)?.snapshot.status).toBe('loops')
  })
})
