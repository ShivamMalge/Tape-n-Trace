/**
 * The lexical analysis demo's own rules — Hopcroft 2e §3.3.2.
 *
 * This exists because two of the five rules shipped unable to match anything at
 * all. `+` is union in this engine (§3.1.2 has no Kleene plus) and `parseRegex`
 * refuses a bare space, so `'=+ +'` and `'  *'` both failed to parse, both
 * produced `dfa: null`, and `tokenise` skipped them — leaving every space, `=`
 * and `+` in the snippet to fall through as one-character ERROR tokens while
 * the rules table displayed them as if they worked. Nothing failed loudly.
 *
 * The rules are imported rather than restated, so this cannot pass while the
 * component says something else.
 */

import { describe, expect, it } from 'vitest'
import { isOk, parseRegex, simulateDFA } from '@tape-n-trace/engine'
import { ALPHABET, DEFAULT_SNIPPET, RULES } from '../components/lexer-demo'
import { buildPlayground } from '../lib/playground'

const dfaFor = (regex: string) => buildPlayground(regex, ALPHABET).dfa

const accepts = (regex: string, word: string): boolean => {
  const dfa = dfaFor(regex)
  if (dfa === null) return false
  const run = simulateDFA(dfa, word)
  return isOk(run) && run.value.result.type === 'acceptance' && run.value.result.accepted
}

describe('every rule is a rule that can match', () => {
  it('parses, and builds a DFA', () => {
    expect(RULES.length).toBeGreaterThan(0)
    for (const rule of RULES) {
      expect(isOk(parseRegex(rule.regex)), `${rule.name} (${rule.regex}) does not parse`).toBe(true)
      expect(dfaFor(rule.regex), `${rule.name} (${rule.regex}) built no DFA`).not.toBeNull()
    }
  })

  it('uses only symbols the demo declares', () => {
    for (const rule of RULES) {
      const symbols = [...rule.regex.replace(/\\(.)/g, '$1')].filter((c) => !'()*+|'.includes(c))
      for (const symbol of symbols) {
        expect(ALPHABET, `${rule.name} uses "${symbol}", outside the alphabet`).toContain(symbol)
      }
    }
  })
})

describe('the rules match what their notes claim', () => {
  const regexOf = (name: string): string => RULES.find((r) => r.name === name)?.regex ?? ''

  it('OP is = or +, and nothing else', () => {
    for (const [word, want] of [
      ['=', true],
      ['+', true],
      ['a', false],
      ['==', false],
      ['', false],
    ] as [string, boolean][]) {
      expect(accepts(regexOf('OP'), word), `OP on "${word}"`).toBe(want)
    }
  })

  it('SPACE is one space or more', () => {
    for (const [word, want] of [
      [' ', true],
      ['  ', true],
      ['    ', true],
      ['', false],
      ['a', false],
    ] as [string, boolean][]) {
      expect(accepts(regexOf('SPACE'), word), `SPACE on "${word}"`).toBe(want)
    }
  })

  it('KEYWORD, IDENT and NUMBER behave as the table says', () => {
    expect(accepts(regexOf('KEYWORD'), 'aa')).toBe(true)
    expect(accepts(regexOf('IDENT'), 'add')).toBe(true)
    expect(accepts(regexOf('IDENT'), 'dd')).toBe(false)
    expect(accepts(regexOf('NUMBER'), 'dd')).toBe(true)
    expect(accepts(regexOf('NUMBER'), 'ad')).toBe(false)
  })
})

describe('the snippet it opens on', () => {
  it('holds only characters the demo can lex', () => {
    for (const character of DEFAULT_SNIPPET) {
      expect(ALPHABET, `"${character}" is outside the alphabet, so it would open on an ERROR`).toContain(character)
    }
  })

  it('is matched end to end by some rule, so nothing opens as ERROR', () => {
    // Every maximal run of the snippet must be accepted by at least one rule.
    for (const piece of DEFAULT_SNIPPET.split(/(\s+)/).filter((p) => p !== '')) {
      const matched = RULES.some((rule) => accepts(rule.regex, piece))
      expect(matched, `"${piece}" matches no rule`).toBe(true)
    }
  })
})
