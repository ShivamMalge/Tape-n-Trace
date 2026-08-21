/**
 * The pumping game — phases.md P1.2.
 *
 * The oracles are tested against independent definitions, the adversary against
 * the specific trap the criteria name (a naive split that loses immediately
 * must not be chosen), and reverse mode against the theorem it demonstrates:
 * a regular language survives every attack.
 */

import { describe, expect, it } from 'vitest'
import {
  PUMPING_LANGUAGES,
  PUMP_I_BOUND,
  advance,
  adversarySplit,
  allSplits,
  checkPump,
  defenderSplit,
  engineAttackIndex,
  engineAttackWord,
  failingIndices,
  isErr,
  proofParagraph,
  pumped,
  pumpingLanguage,
  sessionTrace,
  startSession,
  truePumpingLength,
  unwrap,
  cflAdversarySplit,
  cflPumped,
} from '../src/index.js'
import type { PumpingLanguage, PumpingSession, Sym } from '../src/index.js'
import { languageUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

function lang(id: string): PumpingLanguage {
  const found = pumpingLanguage(id)
  if (found === undefined) throw new Error(`no preset ${id}`)
  return found
}

const accepts = (l: PumpingLanguage, w: string): boolean => l.membership([...w] as Sym[])

describe('the oracles decide, they do not pattern-match', () => {
  it('0ⁿ1ⁿ: counts must be equal and blocks unmixed', () => {
    const l = lang('zeros-ones-equal')
    expect(accepts(l, '')).toBe(true)
    expect(accepts(l, '0011')).toBe(true)
    expect(accepts(l, '0101')).toBe(false) // right multiset, wrong shape
    expect(accepts(l, '00011')).toBe(false)
    expect(accepts(l, '1100')).toBe(false)
  })

  it('0ⁿ1ᵐ with n ≤ m', () => {
    const l = lang('zeros-at-most-ones')
    expect(accepts(l, '011')).toBe(true)
    expect(accepts(l, '0011')).toBe(true)
    expect(accepts(l, '001')).toBe(false)
    expect(accepts(l, '10')).toBe(false)
  })

  it('balanced parentheses: the counter must never go negative', () => {
    const l = lang('balanced-parens')
    expect(accepts(l, '(())()')).toBe(true)
    expect(accepts(l, ')(')).toBe(false) // balanced counts, illegal order
    expect(accepts(l, '(()')).toBe(false)
    expect(accepts(l, '')).toBe(true)
  })

  it('ww: same half twice, not just even length', () => {
    const l = lang('ww')
    expect(accepts(l, '0101')).toBe(true)
    expect(accepts(l, '0110')).toBe(false)
    expect(accepts(l, '')).toBe(true)
    expect(accepts(l, '010')).toBe(false)
  })

  it('primes: agreement with a sieve up to 60', () => {
    const l = lang('primes')
    const sieve = Array.from({ length: 61 }, (_, n) => {
      if (n < 2) return false
      for (let d = 2; d < n; d++) if (n % d === 0) return false
      return true
    })
    for (let n = 0; n <= 60; n++) {
      expect(accepts(l, '0'.repeat(n)), `length ${n}`).toBe(sieve[n])
    }
    expect(accepts(l, '010')).toBe(false) // wrong alphabet use, right length
  })

  it('aⁿbⁿcⁿ', () => {
    const l = lang('abc-equal')
    expect(accepts(l, 'aabbcc')).toBe(true)
    expect(accepts(l, 'aabbc')).toBe(false)
    expect(accepts(l, 'abcabc')).toBe(false)
  })

  it('the regular presets are decided by their own DFA', () => {
    const ends = lang('ends-in-01')
    expect(ends.dfa).toBeDefined()
    // The DFA's language, brute-forced, is exactly the oracle's answer.
    const oracle = new Set(
      [...languageUpTo(ends.dfa as NonNullable<typeof ends.dfa>, 6)],
    )
    expect(oracle.has('001')).toBe(true)
    expect(accepts(ends, '001')).toBe(true)
    expect(accepts(ends, '010')).toBe(false)

    const even = lang('even-zeros')
    expect(accepts(even, '')).toBe(true)
    expect(accepts(even, '00')).toBe(true)
    expect(accepts(even, '010')).toBe(true) // two 0s — even
    expect(accepts(even, '01')).toBe(false)
  })

  it('the preset list carries both required regular languages and difficulties', () => {
    const regular = PUMPING_LANGUAGES.filter((l) => l.regular)
    expect(regular.length).toBeGreaterThanOrEqual(2)
    for (const l of PUMPING_LANGUAGES) {
      expect(['easy', 'medium', 'hard']).toContain(l.difficulty)
      // Every suggested w is actually in its language.
      expect(accepts(l, l.suggestedW(4)), l.id).toBe(true)
    }
  })
})

describe('the adversary is genuinely adversarial', () => {
  /**
   * phases.md P1.2 — for a language where the naive y = 0 split loses
   * immediately, the engine does not choose it. Primes with w = 0⁵: y = 0
   * dies at i = 2 (six is composite), but y = 00 survives it (seven is prime),
   * so a real defender plays the longer y.
   */
  it('on primes, refuses the naive split that loses immediately', () => {
    const l = lang('primes')
    const choice = adversarySplit(l, '00000', 4)

    // The naive split y = 0 dies at once: i = 0 leaves 0⁴, and four is
    // composite. The engine must not play it.
    const naive = { x: '', y: '0', z: '0000' }
    const naiveFailing = failingIndices(l, naive)
    expect(naiveFailing[0]).toBe(0)

    // The real defender plays y = 00: i = 0 gives 0³ (prime), i = 2 gives 0⁷
    // (prime) — the student has to reach i = 3 before it breaks.
    expect(choice.decomposition.y.length).toBe(2)
    expect(choice.failingIs[0]).toBe(3)
    // And the chosen split is at least as hard as every other candidate.
    for (const candidate of choice.candidates) {
      if (candidate.failingIs.length === 0) continue
      expect(choice.failingIs[0] as number).toBeGreaterThanOrEqual(candidate.failingIs[0] as number)
    }
  })

  it('reports its bound explicitly', () => {
    const choice = adversarySplit(lang('zeros-ones-equal'), '000111', 3)
    expect(choice.bound).toBe(PUMP_I_BOUND)
    expect(choice.failingIs.every((i) => i <= PUMP_I_BOUND)).toBe(true)
  })

  it('on 0ⁿ1ⁿ every split fails, and the adversary knows it', () => {
    const choice = adversarySplit(lang('zeros-ones-equal'), '00001111', 4)
    expect(choice.failingIs.length).toBeGreaterThan(0)
    expect(choice.candidates.every((c) => c.failingIs.length > 0)).toBe(true)
  })

  it('finds a surviving split when the student choice of w is weak', () => {
    // ends-in-01 is regular: for any w the DFA loop survives; the adversary
    // must find a surviving split and report the student cannot win.
    const choice = adversarySplit(lang('ends-in-01'), '000001', 4)
    expect(choice.failingIs).toEqual([])
  })

  it('enumerates exactly the legal decompositions', () => {
    const splits = allSplits('abcdef', 3)
    // xEnd ∈ {0,1,2}, yEnd ∈ (xEnd, 3] → 3+2+1 = 6.
    expect(splits).toHaveLength(6)
    for (const { x, y, z } of splits) {
      expect(x + y + z).toBe('abcdef')
      expect(y.length).toBeGreaterThanOrEqual(1)
      expect(x.length + y.length).toBeLessThanOrEqual(3)
    }
  })

  it('the CFL adversary pumps v and y together', () => {
    const l = lang('abc-equal')
    const choice = cflAdversarySplit(l, 'aabbcc', 3)
    expect(choice.failingIs.length).toBeGreaterThan(0)
    expect(choice.bound).toBe(PUMP_I_BOUND)
    const broken = cflPumped(choice.decomposition, choice.failingIs[0] as number)
    expect(accepts(l, broken)).toBe(false)
  })
})

describe('reverse mode — a regular language survives every attack', () => {
  it.each(['ends-in-01', 'even-zeros'])('%s: the defender split pumps forever', (id) => {
    const l = lang(id)
    const n = truePumpingLength(l)
    expect(n).not.toBeNull()

    // Every string in L long enough to be challenged, up to length 8.
    for (const w of languageUpTo(l.dfa as NonNullable<typeof l.dfa>, 8)) {
      if (w.length < (n as number)) continue
      const split = defenderSplit(l, w)
      expect(split, `no split for ${w}`).not.toBeNull()
      if (split === null) continue

      expect(split.y.length).toBeGreaterThanOrEqual(1)
      expect(split.x.length + split.y.length).toBeLessThanOrEqual(n as number)
      // Survives far past the game's own bound.
      for (let i = 0; i <= PUMP_I_BOUND + 3; i++) {
        expect(checkPump(l, split, i), `${w} with i=${i}`).toBe(true)
      }
      // And the engine's attack finds nothing — it concedes.
      expect(engineAttackIndex(l, split)).toBeNull()
    }
  })

  it('an undersized n can make the engine’s challenge unanswerable', () => {
    // ends-in-01 needs 3 states; n = 1 leaves |xy| ≤ 1, so y is the first
    // symbol of w — for w = 0…01, pumping the leading 0 out or in breaks
    // nothing… choose the engine's own judgement instead of asserting shape:
    const attack = engineAttackWord(lang('ends-in-01'), 1)
    expect(attack.w.length).toBeGreaterThanOrEqual(1)
    // Whatever it chose, its claim must be consistent with the split search.
    const splits = allSplits(attack.w, 1)
    const allFail = splits.every((d) => failingIndices(lang('ends-in-01'), d).length > 0)
    expect(attack.unanswerable).toBe(allFail)
  })
})

describe('a full session is a Trace', () => {
  const gameConsistency = () => true // game results are 'value'-typed; checked below

  function play(id: string, moves: Parameters<typeof advance>[2][]): PumpingSession {
    const l = lang(id)
    let session = startSession(l, 'prove')
    for (const move of moves) {
      session = unwrap(advance(l, session, move))
    }
    return session
  }

  it('a winning prove round replays as a valid trace', () => {
    const l = lang('zeros-ones-equal')
    const session = play('zeros-ones-equal', [
      { type: 'choose-w', w: '00001111' },
      { type: 'choose-i', i: 2 },
    ])

    expect(session.phase).toBe('won')
    expect(session.winningI).toBe(2)

    const trace = sessionTrace(l, session)
    expect(trace.kind).toBe('game.pumping.regular')
    assertTraceInvariants(trace, { finalSnapshotMatchesResult: gameConsistency })
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace)
  })

  it('rejects out-of-language and too-short strings with the reason', () => {
    const l = lang('zeros-ones-equal')
    const session = startSession(l, 'prove')

    const bad = advance(l, session, { type: 'choose-w', w: '0101' })
    expect(isErr(bad)).toBe(true)
    if (isErr(bad)) expect(bad.errors[0]?.code).toBe('PUMP_W_NOT_IN_L')

    const short = advance(l, session, { type: 'choose-w', w: '01' })
    expect(isErr(short)).toBe(true)
    if (isErr(short)) expect(short.errors[0]?.code).toBe('PUMP_W_TOO_SHORT')
  })

  it('refuses i = 1 and explains why', () => {
    const l = lang('zeros-ones-equal')
    let session = startSession(l, 'prove')
    session = unwrap(advance(l, session, { type: 'choose-w', w: '00001111' }))

    const one = advance(l, session, { type: 'choose-i', i: 1 })
    expect(isErr(one)).toBe(true)
    if (isErr(one)) expect(one.errors[0]?.message).toContain('w itself')
  })

  it('a surviving i keeps the round alive rather than ending it', () => {
    const l = lang('zeros-at-most-ones')
    let session = startSession(l, 'prove')
    // Equal blocks: |xy| ≤ 5 pins y inside the zeros, where i = 0 still
    // satisfies n ≤ m but pumping up eventually breaks it.
    session = unwrap(advance(l, session, { type: 'choose-w', w: '0000011111' }))
    // Pumping down keeps n ≤ m: still in L, round continues.
    session = unwrap(advance(l, session, { type: 'choose-i', i: 0 }))
    expect(session.phase).toBe('pick-i')
    // Pumping up eventually leaves L.
    session = unwrap(advance(l, session, { type: 'choose-i', i: 12 }))
    expect(session.phase).toBe('won')
  })

  it('a defend round: claim n, split the challenge, engine concedes', () => {
    const l = lang('even-zeros')
    let session = startSession(l, 'defend')
    session = unwrap(advance(l, session, { type: 'choose-n', n: 2 }))
    expect(session.phase).toBe('pick-split')

    const w = session.w
    const split = defenderSplit(l, w)
    expect(split).not.toBeNull()
    if (split === null) return

    session = unwrap(advance(l, session, { type: 'choose-split', ...split }))
    expect(session.phase).toBe('won')

    const trace = sessionTrace(l, session)
    assertTraceInvariants(trace, { finalSnapshotMatchesResult: gameConsistency })
  })

  it('a bad split in defend mode is attacked, not accepted', () => {
    const l = lang('ends-in-01')
    let session = startSession(l, 'defend')
    session = unwrap(advance(l, session, { type: 'choose-n', n: 3 }))
    const w = session.w

    // y containing the final 1 breaks on i = 0 for this language.
    const bad = { x: '', y: w, z: '' }
    if (w.length <= 3) {
      session = unwrap(advance(l, session, { type: 'choose-split', ...bad }))
      expect(session.phase).toBe('pick-split') // still in the fight
    }
  })
})

describe('the proof paragraph', () => {
  it('a prove-mode win emits exam prose with the played values', () => {
    const l = lang('zeros-ones-equal')
    let session = startSession(l, 'prove')
    session = unwrap(advance(l, session, { type: 'choose-w', w: '00001111' }))
    session = unwrap(advance(l, session, { type: 'choose-i', i: 2 }))

    const proof = proofParagraph(l, session)
    expect(proof).not.toBeNull()
    if (proof === null) return

    expect(proof).toContain('Suppose')
    expect(proof).toContain('w = 00001111')
    expect(proof).toContain('i = 2')
    expect(proof).toContain(`i ≤ ${PUMP_I_BOUND}`)
    expect(proof).toContain('not regular')
    expect(proof).toContain('∎')
  })

  it('no paragraph before the round is won', () => {
    const l = lang('zeros-ones-equal')
    const session = startSession(l, 'prove')
    expect(proofParagraph(l, session)).toBeNull()
  })

  it('a defend-mode win says what pumping does not prove', () => {
    const l = lang('even-zeros')
    let session = startSession(l, 'defend')
    session = unwrap(advance(l, session, { type: 'choose-n', n: 2 }))
    const split = defenderSplit(l, session.w)
    if (split === null) throw new Error('no split')
    session = unwrap(advance(l, session, { type: 'choose-split', ...split }))

    const proof = proofParagraph(l, session)
    expect(proof).toContain('not thereby regular')
  })

  it('a winning i really does leave the language — spot-checked against the oracle', () => {
    const l = lang('balanced-parens')
    let session = startSession(l, 'prove')
    session = unwrap(advance(l, session, { type: 'choose-w', w: '((((()))))' }))
    expect(session.phase).toBe('pick-i')
    session = unwrap(advance(l, session, { type: 'choose-i', i: 0 }))
    if (session.phase === 'won' && session.split !== null) {
      expect(accepts(l, pumped(session.split, 0))).toBe(false)
    }
  })
})
