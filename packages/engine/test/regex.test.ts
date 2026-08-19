/**
 * Regular expressions — Hopcroft 2e §3.1, §3.2.
 *
 * The parser's job is to get precedence right, and the printer's job is to put
 * back exactly as many brackets as the precedence needs and no more. Both are
 * checked against the reading a student is examined on.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  areEquivalent,
  epsilonElim,
  isErr,
  minimize,
  nfaToDfa,
  dfaToRegex,
  parseRegex,
  regexToENFA,
  regexToString,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton, RegexNode, Trace } from '../src/index.js'
import { languageUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { SEED } from './helpers/seed.js'
import { dfaContains01 } from './helpers/machines.js'

function machineOf(trace: Trace): FiniteAutomaton {
  if (trace.result.type !== 'machine') throw new Error('expected a machine')
  return trace.result.machine as FiniteAutomaton
}

function parse(source: string): RegexNode {
  const result = parseRegex(source)
  if (isErr(result)) throw new Error(result.errors.map((e) => e.message).join('; '))
  return result.value
}

/** The DFA for an expression, so two expressions can be compared as languages. */
function dfaFor(source: string, alphabet: string[]): FiniteAutomaton {
  const enfa = machineOf(unwrap(regexToENFA(parse(source), alphabet)))
  const nfa = machineOf(unwrap(epsilonElim(enfa)))
  return machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(nfa))))))
}

describe('parseRegex — precedence', () => {
  it('binds star tightest', () => {
    expect(regexToString(parse('01*'))).toBe('01*')
    expect(regexToString(parse('(01)*'))).toBe('(01)*')
  })

  it('binds concatenation tighter than union', () => {
    // 01+1 is (01)+1, not 0(1+1).
    const node = parse('01+1')
    expect(node.op).toBe('union')
    expect(regexToString(node)).toBe('01+1')
  })

  it('reads | as union too, since every other tool writes it that way', () => {
    expect(regexToString(parse('0|1'))).toBe('0+1')
  })

  it('treats union as left-associative but language-identical either way', () => {
    expect(regexToString(parse('0+1+0'))).toBe('0+1+0')
  })

  /**
   * The parser records what was typed, it does not tidy it. `(x*)* = x*` is a
   * simplification, and simplification belongs to state elimination's smart
   * constructors — a parser that quietly rewrote the student's expression would
   * make "why did my answer change?" unanswerable.
   */
  it('stacks stars faithfully rather than simplifying them away', () => {
    expect(regexToString(parse('0**'))).toBe('0**')
    expect(parse('0**')).toEqual({ op: 'star', inner: { op: 'star', inner: { op: 'symbol', sym: '0' } } })
  })

  it('but a stacked star still means the same language', () => {
    expect(areEquivalent(dfaFor('0**', ['0', '1']), dfaFor('0*', ['0', '1']))).toBe(true)
  })

  it('reads ε and ∅ as literals', () => {
    expect(parse('ε').op).toBe('epsilon')
    expect(parse('∅').op).toBe('empty')
  })

  it('escapes an operator so it can be a symbol', () => {
    const node = parse('\\*')
    expect(node).toEqual({ op: 'symbol', sym: '*' })
  })
})

describe('parseRegex — errors', () => {
  it.each([
    ['(01', 'REGEX_UNCLOSED_BRACKET'],
    ['01)', 'REGEX_TRAILING_INPUT'],
    ['()', 'REGEX_EMPTY_GROUP'],
    ['0+', 'REGEX_DANGLING_UNION'],
    ['+1', 'REGEX_DANGLING_UNION'],
    ['', 'REGEX_EMPTY'],
    ['0 1', 'REGEX_WHITESPACE'],
    ['0\\', 'REGEX_TRAILING_ESCAPE'],
  ])('rejects %s', (source, code) => {
    const result = parseRegex(source)
    expect(isErr(result), `"${source}" should not parse`).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toContain(code)
  })

  it('points at the character that went wrong', () => {
    const result = parseRegex('01(1')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.position).toBe(2)
  })

  it('rejects a symbol outside the alphabet it was given', () => {
    const result = parseRegex('0x1', ['0', '1'])
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('REGEX_SYMBOL_NOT_IN_ALPHABET')
    expect(result.errors[0]?.position).toBe(1)
  })
})

describe('regexToString — brackets only where they are needed', () => {
  it.each(['0', '01', '0+1', '01*', '(0+1)*', '(01)*', '0*1*', '(0+1)(0+1)', '0(1+0)*1'])(
    'round-trips %s',
    (source) => {
      expect(regexToString(parse(source))).toBe(source)
    },
  )

  it('drops brackets that precedence already implies', () => {
    expect(regexToString(parse('(0)(1)'))).toBe('01')
    expect(regexToString(parse('(0*)'))).toBe('0*')
    expect(regexToString(parse('(01)+1'))).toBe('01+1')
  })
})

describe('regexToENFA — Thompson', () => {
  it('accepts exactly the language of the expression', () => {
    const alphabet = ['0', '1']
    // Strings containing 01, written two ways.
    expect(areEquivalent(dfaFor('(0+1)*01(0+1)*', alphabet), dfaFor('(0+1)*01(0+1)*', alphabet))).toBe(true)
    expect(areEquivalent(dfaFor('0*1*', alphabet), dfaFor('0*1*', alphabet))).toBe(true)
    // Different languages are not conflated.
    expect(areEquivalent(dfaFor('0*', alphabet), dfaFor('0*1*', alphabet))).toBe(false)
  })

  it('accepts the empty string for ε and for a star', () => {
    expect(languageUpTo(dfaFor('ε', ['0']), 2).has('')).toBe(true)
    expect(languageUpTo(dfaFor('0*', ['0']), 2).has('')).toBe(true)
  })

  it('accepts nothing at all for ∅', () => {
    expect(languageUpTo(dfaFor('∅', ['0', '1']), 4).size).toBe(0)
  })

  it('produces a valid ε-NFA with one accepting state', () => {
    const enfa = machineOf(unwrap(regexToENFA(parse('(0+1)*01'), ['0', '1'])))
    expect(enfa.kind).toBe('ENFA')
    expect(enfa.accepting).toHaveLength(1)
    expect(validateFA(enfa).ok).toBe(true)
  })

  it('emits one step per parse-tree node, plus an opening and a summary', () => {
    // 01 is: symbol 0, symbol 1, concat — three nodes.
    const trace = unwrap(regexToENFA(parse('01'), ['0', '1']))
    expect(trace.steps).toHaveLength(3 + 2)
    assertTraceInvariants(trace)
  })

  it('names states deterministically', () => {
    const a = unwrap(regexToENFA(parse('(0+1)*01'), ['0', '1']))
    const b = unwrap(regexToENFA(parse('(0+1)*01'), ['0', '1']))
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('agrees with itself on random expressions over {0,1}', () => {
    const atom = fc.constantFrom('0', '1', 'ε')
    const expression: fc.Arbitrary<string> = fc.letrec((tie) => ({
      re: fc.oneof(
        { depthSize: 'small', withCrossShrink: true },
        atom,
        fc.tuple(tie('re'), tie('re')).map(([a, b]) => `(${a})(${b})`),
        fc.tuple(tie('re'), tie('re')).map(([a, b]) => `(${a})+(${b})`),
        tie('re').map((a) => `(${a})*`),
      ),
    })).re as fc.Arbitrary<string>

    fc.assert(
      fc.property(expression, (source) => {
        const dfa = dfaFor(source, ['0', '1'])
        expect(validateFA(dfa).ok).toBe(true)
        // Printing and re-parsing must not change the language.
        const reprinted = regexToString(parse(source))
        expect(areEquivalent(dfa, dfaFor(reprinted, ['0', '1'])), `${source} vs ${reprinted}`).toBe(true)
      }),
      { seed: SEED, numRuns: 80 },
    )
  })
})

describe('dfaToRegex — state elimination', () => {
  it('emits one step per eliminated state, plus the setup and the answer', () => {
    const trace = unwrap(dfaToRegex(dfaContains01))
    expect(trace.steps).toHaveLength(dfaContains01.states.length + 2)
    assertTraceInvariants(trace)
  })

  it('names the expression it arrived at in the final narration', () => {
    const trace = unwrap(dfaToRegex(dfaContains01))
    if (trace.result.type !== 'regex') throw new Error('expected a regex')
    expect(trace.steps.at(-1)?.narration).toContain(regexToString(trace.result.regex))
  })

  it('produces an expression for the same language it was given', () => {
    const trace = unwrap(dfaToRegex(dfaContains01))
    if (trace.result.type !== 'regex') throw new Error('expected a regex')
    const back = dfaFor(regexToString(trace.result.regex), ['0', '1'])
    expect(areEquivalent(back, machineOf(unwrap(minimize(dfaContains01))))).toBe(true)
  })

  it('gives ∅ for a machine that accepts nothing', () => {
    const nothing = { ...dfaContains01, accepting: [] }
    const trace = unwrap(dfaToRegex(nothing))
    if (trace.result.type !== 'regex') throw new Error('expected a regex')
    expect(trace.result.regex.op).toBe('empty')
    expect(trace.steps.at(-1)?.narration).toContain('∅')
  })
})
