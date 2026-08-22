/**
 * Pushdown automata — phases.md P1.4.
 *
 * The presets are checked against independent membership predicates written in
 * a different shape (counters and string surgery, not configuration search), the
 * acceptance conversions against exhaustive samples in both directions, the ID
 * log character for character against the textbook's worked example, and the
 * DPDA checker against the exact set of overlapping pairs.
 */

import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  PDA_PRESETS,
  acceptsPDA,
  cfgToPDA,
  checkDeterminism,
  emptyStackToFinalState,
  finalStateToEmptyStack,
  generatedStrings,
  idLog,
  isErr,
  parseGrammar,
  pdaPreset,
  pdaTransitionId,
  simulatePDA,
  unwrap,
} from '../src/index.js'
import type { PDA, PdaSnapshot, Step, Sym } from '../src/index.js'
import { allStringsUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

function preset(id: string): PDA {
  const found = pdaPreset(id)
  if (found === undefined) throw new Error(`no preset ${id}`)
  return found.machine
}

/** Independent predicates, deliberately unlike a configuration search. */
const ORACLES: Record<string, (w: string) => boolean> = {
  anbn: (w) => {
    const a = /^(a*)(b*)$/.exec(w)
    return a !== null && (a[1] as string).length === (a[2] as string).length
  },
  wwr: (w) => {
    if (w.length % 2 !== 0) return false
    const half = w.length / 2
    return w.slice(0, half) === [...w.slice(half)].reverse().join('')
  },
  wcwr: (w) => {
    if (w.length % 2 !== 1) return false
    const mid = (w.length - 1) / 2
    if (w[mid] !== 'c') return false
    const left = w.slice(0, mid)
    const right = w.slice(mid + 1)
    return !left.includes('c') && !right.includes('c') && left === [...right].reverse().join('')
  },
  'balanced-parens': (w) => {
    let depth = 0
    for (const ch of w) {
      depth += ch === '(' ? 1 : -1
      if (depth < 0) return false
    }
    return depth === 0
  },
}

describe('the presets accept exactly their stated languages', () => {
  it.each(PDA_PRESETS.map((p) => p.id))('%s agrees with an independent oracle on every short string', (id) => {
    const found = pdaPreset(id)
    if (found === undefined) throw new Error(`no preset ${id}`)
    const oracle = ORACLES[id]
    if (oracle === undefined) throw new Error(`no oracle for ${id}`)

    for (const word of allStringsUpTo(found.machine.inputAlphabet, 6)) {
      const w = word.join('')
      expect(acceptsPDA(found.machine, w), `${id} on "${w}"`).toBe(oracle(w))
    }
  })

  it('every suggested string that should be accepted is, with trace invariants holding', () => {
    for (const p of PDA_PRESETS) {
      for (const w of p.suggested) {
        const trace = unwrap(simulatePDA(p.machine, w))
        assertTraceInvariants(trace)
        expect(trace.result.type, `${p.id} on "${w}" hit a cap`).toBe('acceptance')
      }
    }
  })
})

describe('the ID log — the artefact the exam marks', () => {
  it('matches textbook notation character for character on aⁿbⁿ with aaabbb', () => {
    const trace = unwrap(simulatePDA(preset('anbn'), 'aaabbb'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })

    expect(idLog(trace)).toBe(
      '(q0, aaabbb, Z0) ⊢ (q0, aabbb, AZ0) ⊢ (q0, abbb, AAZ0) ⊢ (q0, bbb, AAAZ0) ⊢ ' +
        '(q1, bb, AAZ0) ⊢ (q1, b, AZ0) ⊢ (q1, ε, Z0) ⊢ (q2, ε, Z0)',
    )
  })

  it('on a rejected string, logs the furthest surviving attempt rather than nothing', () => {
    const trace = unwrap(simulatePDA(preset('anbn'), 'aab'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: false })
    const log = idLog(trace)
    expect(log.startsWith('(q0, aab, Z0)')).toBe(true)
    expect(log).toContain(' ⊢ ')
  })

  it('writes ε for both an empty input and an empty stack', () => {
    const trace = unwrap(simulatePDA(preset('balanced-parens'), '()'))
    expect(idLog(trace).endsWith('(q0, ε, ε)')).toBe(true)
  })
})

describe('a nondeterministic run shows its branch tree', () => {
  it('wwᴿ on 0110: the accepting guess survives, wrong guesses are flagged dead at their death step', () => {
    const trace = unwrap(simulatePDA(preset('wwr'), '0110'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    assertTraceInvariants(trace)

    const nodes = (trace.steps.at(-1) as Step<PdaSnapshot>).snapshot.nodes
    expect(nodes.some((n) => n.status === 'accepting')).toBe(true)

    const dead = nodes.filter((n) => n.status === 'dead')
    expect(dead.length).toBeGreaterThan(0)
    for (const n of dead) {
      expect(n.diedAtStep, `dead node ${n.id} has no death step`).toBeDefined()
      expect(n.note, `dead node ${n.id} has no reason`).toBeDefined()
      // The flag appears at the step of death, not only in the final frame.
      const at = trace.steps[Math.min(n.diedAtStep as number, trace.steps.length - 1)] as Step<PdaSnapshot>
      const there = at.snapshot.nodes.find((m) => m.id === n.id)
      if (there !== undefined) expect(there.status).toBe('dead')
    }
  })

  // Slow under coverage instrumentation — the tree is O(cap²) even at a small cap.
  it('a run that can grow its stack forever is stopped and says so', { timeout: 60_000 }, () => {
    const growing: PDA = {
      states: ['q0'],
      inputAlphabet: ['a'],
      stackAlphabet: ['Z0', 'A'],
      transitions: [{ id: pdaTransitionId('q0', null, null, ['A'], 'q0'), from: 'q0', read: null, pop: null, to: 'q0', push: ['A'] }],
      start: 'q0',
      startStack: 'Z0',
      accepting: [],
      acceptBy: 'finalState',
    }

    // A small cap: the guard's honesty is what is under test, not its size —
    // and a pathological tree costs O(cap²) to snapshot.
    const trace = unwrap(simulatePDA(growing, 'a', { maxNodes: 400 }))
    expect(trace.result.type).toBe('incomplete')
    expect((trace.steps.at(-1) as Step<PdaSnapshot>).snapshot.status).toBe('stopped')
    expect(trace.meta.truncated).toBeDefined()
    assertTraceInvariants(trace)

    // The fast path refuses to answer rather than saying "rejected".
    expect(acceptsPDA(growing, 'a', 400)).toBeNull()
  })

  it('rejects with every branch dead, never via a silent cap', () => {
    const trace = unwrap(simulatePDA(preset('wwr'), '010'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: false })
    const nodes = (trace.steps.at(-1) as Step<PdaSnapshot>).snapshot.nodes
    expect(nodes.every((n) => n.status === 'dead')).toBe(true)
  })
})

describe('acceptance-mode conversions preserve the language on an exhaustive sample', () => {
  it('final state → empty stack: aⁿbⁿ, every string to length 7', () => {
    const source = preset('anbn')
    const trace = unwrap(finalStateToEmptyStack(source))
    assertTraceInvariants(trace)
    const target = (trace.result as { type: 'machine'; machine: PDA }).machine
    expect(target.acceptBy).toBe('emptyStack')

    for (const word of allStringsUpTo(source.inputAlphabet, 7)) {
      const w = word.join('')
      expect(acceptsPDA(target, w), `converted machine on "${w}"`).toBe(acceptsPDA(source, w))
    }
  })

  it('final state → empty stack: wcwᴿ, every string to length 5', () => {
    const source = preset('wcwr')
    const target = (unwrap(finalStateToEmptyStack(source)).result as { type: 'machine'; machine: PDA }).machine
    for (const word of allStringsUpTo(source.inputAlphabet, 5)) {
      const w = word.join('')
      expect(acceptsPDA(target, w), `converted machine on "${w}"`).toBe(acceptsPDA(source, w))
    }
  })

  it('empty stack → final state: balanced parentheses, every string to length 7', () => {
    const source = preset('balanced-parens')
    const trace = unwrap(emptyStackToFinalState(source))
    assertTraceInvariants(trace)
    const target = (trace.result as { type: 'machine'; machine: PDA }).machine
    expect(target.acceptBy).toBe('finalState')
    expect(target.accepting).toHaveLength(1)

    for (const word of allStringsUpTo(source.inputAlphabet, 7)) {
      const w = word.join('')
      expect(acceptsPDA(target, w), `converted machine on "${w}"`).toBe(acceptsPDA(source, w))
    }
  })

  it('round trip final → empty → final still preserves the language', () => {
    const source = preset('anbn')
    const once = (unwrap(finalStateToEmptyStack(source)).result as { type: 'machine'; machine: PDA }).machine
    const twice = (unwrap(emptyStackToFinalState(once)).result as { type: 'machine'; machine: PDA }).machine

    for (const word of allStringsUpTo(source.inputAlphabet, 6)) {
      const w = word.join('')
      expect(acceptsPDA(twice, w), `round-tripped machine on "${w}"`).toBe(acceptsPDA(source, w))
    }
  })

  it('a machine with no accepting state converts to one that accepts nothing', () => {
    const source: PDA = { ...preset('anbn'), accepting: [] }
    const target = (unwrap(finalStateToEmptyStack(source)).result as { type: 'machine'; machine: PDA }).machine
    for (const word of allStringsUpTo(source.inputAlphabet, 5)) {
      expect(acceptsPDA(target, word.join(''))).toBe(false)
    }
  })
})

describe('CFG → PDA accepts exactly what the grammar derives', () => {
  // Exhaustive up to a length bound — strictly stronger than a random sample.
  // Left-recursive grammars are excluded by construction: the one-state PDA
  // mirrors leftmost derivations, and a left-recursive expansion loops exactly
  // as the derivation does (§6.3.1 assumes nothing, but the *search* must halt).
  const GRAMMARS = [
    { name: 'aⁿbⁿ', text: 'S -> a S b | ε', maxLength: 6 },
    { name: 'balanced parentheses', text: 'S -> ( S ) S | ε', maxLength: 6 },
    { name: 'equal 0s then 1s, nonempty', text: 'S -> 0 S 1 | 0 1', maxLength: 6 },
  ]

  it.each(GRAMMARS)('$name: membership agrees on every string to the bound', ({ text, maxLength }) => {
    const grammar = unwrap(parseGrammar(text))
    const trace = unwrap(cfgToPDA(grammar))
    assertTraceInvariants(trace)
    const machine = (trace.result as { type: 'machine'; machine: PDA }).machine

    expect(machine.states).toHaveLength(1)
    expect(machine.acceptBy).toBe('emptyStack')

    const derived = generatedStrings(grammar, maxLength)
    for (const word of allStringsUpTo(machine.inputAlphabet, maxLength)) {
      const w = word.join('')
      expect(acceptsPDA(machine, word as Sym[]), `PDA on "${w}"`).toBe(derived.has(w))
    }
  })

  it('has one expansion move per production and one match move per terminal', () => {
    const grammar = unwrap(parseGrammar('S -> a S b | ε'))
    const machine = (unwrap(cfgToPDA(grammar)).result as { type: 'machine'; machine: PDA }).machine
    expect(machine.transitions).toHaveLength(grammar.productions.length + grammar.terminals.length)
    expect(machine.startStack).toBe('S')
  })

  it('refuses a grammar whose variables and terminals overlap', () => {
    const grammar = unwrap(parseGrammar('S -> a S b | ε'))
    const clashed = { ...grammar, terminals: [...grammar.terminals, 'S'] }
    const result = cfgToPDA(clashed)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.code).toBe('CFG_SYMBOL_OVERLAP')
  })
})

describe('the DPDA checker reports exactly the overlapping pairs', () => {
  it('wcwᴿ is deterministic — the empty report', () => {
    expect(checkDeterminism(preset('wcwr'))).toEqual({ deterministic: true, violations: [] })
  })

  it('wwᴿ: exactly the six ε-guess-versus-read pairs, and nothing else', () => {
    const report = checkDeterminism(preset('wwr'))
    expect(report.deterministic).toBe(false)

    const pair = (a: string, b: string): string => `${a} ~ ${b}`
    const reader = (read: string, pop: string, push: string[]): string => pdaTransitionId('q0', read, pop, push, 'q0')
    const guess = (pop: string): string => pdaTransitionId('q0', null, pop, [pop], 'q1')

    const expected = new Set([
      pair(reader('0', 'Z0', ['0', 'Z0']), guess('Z0')),
      pair(reader('1', 'Z0', ['1', 'Z0']), guess('Z0')),
      pair(reader('0', '0', ['0', '0']), guess('0')),
      pair(reader('1', '0', ['1', '0']), guess('0')),
      pair(reader('0', '1', ['0', '1']), guess('1')),
      pair(reader('1', '1', ['1', '1']), guess('1')),
    ])
    expect(new Set(report.violations.map((v) => pair(v.a, v.b)))).toEqual(expected)

    for (const v of report.violations) {
      expect(v.reason).toContain('ε-move')
    }
  })

  it('a pop-anything transition overlaps every pop guard', () => {
    const machine: PDA = {
      states: ['q0'],
      inputAlphabet: ['a'],
      stackAlphabet: ['Z0', 'X'],
      transitions: [
        { id: 'any', from: 'q0', read: 'a', pop: null, to: 'q0', push: [] },
        { id: 'onX', from: 'q0', read: 'a', pop: 'X', to: 'q0', push: [] },
      ],
      start: 'q0',
      startStack: 'Z0',
      accepting: [],
      acceptBy: 'finalState',
    }
    const report = checkDeterminism(machine)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]).toMatchObject({ a: 'any', b: 'onX' })
    expect(report.violations[0]?.reason).toContain('more than one element')
  })

  it('two ε-moves on different stack tops do not conflict', () => {
    const machine: PDA = {
      states: ['q0', 'q1'],
      inputAlphabet: ['a'],
      stackAlphabet: ['Z0', 'X'],
      transitions: [
        { id: 'eZ', from: 'q0', read: null, pop: 'Z0', to: 'q1', push: [] },
        { id: 'eX', from: 'q0', read: null, pop: 'X', to: 'q1', push: [] },
      ],
      start: 'q0',
      startStack: 'Z0',
      accepting: [],
      acceptBy: 'finalState',
    }
    expect(checkDeterminism(machine).deterministic).toBe(true)
  })

  it('the gallery flags carry the checker verdict, not a hand-written claim', () => {
    for (const p of PDA_PRESETS) {
      expect(checkDeterminism(p.machine).deterministic, p.id).toBe(p.deterministic)
    }
  })
})

describe('validation reports every problem at once', () => {
  it('names the unknown state, stack symbol and input symbol together', () => {
    const broken: PDA = {
      states: ['q0'],
      inputAlphabet: ['a'],
      stackAlphabet: ['Z0'],
      transitions: [{ id: 'bad', from: 'ghost', read: 'z', pop: 'Y', to: 'q0', push: ['W'] }],
      start: 'q0',
      startStack: 'Z0',
      accepting: ['gone'],
      acceptBy: 'finalState',
    }
    const result = simulatePDA(broken, 'a')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('PDA_FROM_UNKNOWN')
    expect(codes).toContain('PDA_READ_UNKNOWN')
    expect(codes).toContain('PDA_POP_UNKNOWN')
    expect(codes).toContain('PDA_PUSH_UNKNOWN')
    expect(codes).toContain('PDA_ACCEPTING_UNKNOWN')
  })

  it('rejects an input containing a symbol outside the alphabet, naming it', () => {
    const result = simulatePDA(preset('anbn'), 'axb')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.message).toContain('"x"')
  })
})

describe('honest caps', () => {
  it('the narration cap silences commentary without changing the verdict', () => {
    // A deterministic counter machine long past 300 steps: aⁿbⁿ with n = 200.
    const w = 'a'.repeat(200) + 'b'.repeat(200)
    const trace = unwrap(simulatePDA(preset('anbn'), w))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    expect(trace.meta.truncated).toBeDefined()
    expect(trace.steps.length).toBeLessThanOrEqual(LIMITS.TRACE_STEPS + 1)
    expect((trace.steps.at(-1) as Step<PdaSnapshot>).snapshot.status).toBe('accepted')
  })
})
