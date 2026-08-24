/**
 * Undecidability — phases.md P1.7.
 *
 * The two numberings of §9.1 are held to the book's own worked examples:
 * Exercise 9.1.1's strings, Example 9.1's code character for character, and
 * Exercise 9.1.2's machine. The diagonalization table is held to the footnote
 * to Fig. 9.1 — the top rows really are solid 0s, and this finds out where they
 * stop by searching rather than by being told. The reduction builder is held to
 * the box on p. 316: a reduction that runs the wrong way is refused.
 */

import { describe, expect, it } from 'vitest'
import {
  FIRST_ACCEPTING_CODE_INDEX,
  FIRST_CODE_INDEX,
  FIRST_NON_HALTING_CODE_INDEX,
  LIMITS,
  PROBLEMS,
  REDUCTIONS,
  binaryString,
  cellDigit,
  codedRuleText,
  decodeTM,
  diagonalArgument,
  diagonalTable,
  encodePair,
  encodeTM,
  isErr,
  isKnownHard,
  machineAt,
  problemById,
  reduce,
  reductionsFrom,
  simulateTM,
  splitPair,
  stringIndex,
  tmPreset,
  unwrap,
} from '../src/index.js'
import type { DiagonalSnapshot, ProblemReductionSnapshot, TuringMachine } from '../src/index.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

/** These traces end in a proof, not in an accept or a reject, so they bring their own checker. */
const endsIn = (phase: string) => (snapshot: unknown) =>
  (snapshot as { phase?: string }).phase === phase || `the last step is in phase ${String((snapshot as { phase?: string }).phase)}`

function preset(id: string): NonNullable<ReturnType<typeof tmPreset>> {
  const found = tmPreset(id)
  if (found === undefined) throw new Error(`no preset ${id}`)
  return found
}

/** Example 9.1, p. 370 — M = ({q₁, q₂, q₃}, {0,1}, {0,1,B}, δ, q₁, B, {q₂}). */
const example91: TuringMachine = {
  states: ['q1', 'q2', 'q3'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  transitions: [
    { id: 'a', from: 'q1', read: ['1'], to: 'q3', write: ['0'], move: ['R'] },
    { id: 'b', from: 'q3', read: ['0'], to: 'q1', write: ['1'], move: ['R'] },
    { id: 'c', from: 'q3', read: ['1'], to: 'q2', write: ['0'], move: ['R'] },
    { id: 'd', from: 'q3', read: ['B'], to: 'q2', write: ['1'], move: ['L'] },
  ],
  start: 'q1',
  accepting: ['q2'],
  tapes: 1,
}

describe('enumerating the binary strings — §9.1.1', () => {
  it('numbers them by treating 1w as a binary integer', () => {
    expect(binaryString(1)).toBe('')
    expect(binaryString(2)).toBe('0')
    expect(binaryString(3)).toBe('1')
    expect(binaryString(4)).toBe('00')
    expect(binaryString(5)).toBe('01')
    expect(binaryString(6)).toBe('10')
    expect(binaryString(7)).toBe('11')
    expect(binaryString(8)).toBe('000')
  })

  it('answers Exercise 9.1.1', () => {
    expect(binaryString(37)).toBe('00101')
    expect(binaryString(100)).toBe('100100')
  })

  it('orders by length, then lexicographically within a length', () => {
    const words = Array.from({ length: 64 }, (_, n) => binaryString(n + 1))
    for (let n = 1; n < words.length; n++) {
      const before = words[n - 1] as string
      const here = words[n] as string
      expect(before.length <= here.length).toBe(true)
      if (before.length === here.length) expect(before < here).toBe(true)
    }
  })

  it('round-trips against the index for every string to length 10', () => {
    for (let i = 1; i <= 2047; i++) {
      expect(stringIndex(binaryString(i))).toBe(BigInt(i))
    }
  })

  it('refuses an index below 1 and a string that is not binary', () => {
    expect(() => binaryString(0)).toThrow(/numbers them from 1/)
    expect(() => stringIndex('012')).toThrow(/not a binary string/)
  })
})

describe('codes for Turing machines — §9.1.2', () => {
  it('codes Example 9.1 rule for rule', () => {
    const coded = unwrap(encodeTM(example91))
    expect(coded.rules.map((r) => r.code)).toEqual([
      // δ(q₁, X₂) = (q₃, X₁, D₂) — the rule §9.1.2 spells out: 0¹10²10³10¹10².
      '0100100010100',
      // δ(q₃, X₁) = (q₁, X₂, D₂).
      '0001010100100',
      // δ(q₃, X₂) = (q₂, X₁, D₂).
      '00010010010100',
      // δ(q₃, X₃) = (q₂, X₂, D₁) — 0³10³10²10²10¹. See docs/citations.md: the
      // scanned copy cannot be read digit by digit at this length, so this code
      // and the joined one below follow the scheme the section states in prose,
      // which the three above confirm character for character.
      '000100010010010',
    ])
  })

  it('joins the rules with 11, as C₁11C₂11⋯11C_n', () => {
    const coded = unwrap(encodeTM(example91))
    expect(coded.code).toBe(coded.rules.map((r) => r.code).join('11'))
    expect(coded.code).toBe(
      '0100100010100110001010100100110001001001010011000100010010010',
    )
  })

  it('assigns the numbers §9.1.2 fixes: q₁ is the start, q₂ accepts, X₁X₂X₃ are 0, 1, B', () => {
    const coded = unwrap(encodeTM(example91))
    expect(coded.states).toEqual(['q1', 'q2', 'q3'])
    expect(coded.symbols).toEqual(['0', '1', 'B'])
  })

  it('writes the rules the way the book does', () => {
    const coded = unwrap(encodeTM(example91))
    expect(codedRuleText(coded.rules[0] as never)).toBe('δ(q₁, X₂) = (q₃, X₁, D₂)')
  })

  it('codes the pair (M, w) as the code, 111, then w — Example 9.1', () => {
    const coded = unwrap(encodePair(example91, '1011'))
    expect(coded).toBe(`${unwrap(encodeTM(example91)).code}1111011`)
    expect(splitPair(coded)).toEqual({ machineCode: unwrap(encodeTM(example91)).code, word: '1011' })
  })

  it('decodes its own code back to the same machine', () => {
    const decoded = decodeTM(unwrap(encodeTM(example91)).code)
    expect(decoded.valid).toBe(true)
    expect(decoded.machine.states).toEqual(['q1', 'q2', 'q3'])
    expect(decoded.machine.accepting).toEqual(['q2'])
    expect(decoded.machine.transitions.map((t) => `${t.from} ${t.read[0]} ${t.to} ${t.write[0]} ${t.move[0]}`).sort()).toEqual(
      ['q1 1 q3 0 R', 'q3 0 q1 1 R', 'q3 1 q2 0 R', 'q3 B q2 1 L'].sort(),
    )
  })

  it('codes Exercise 9.1.2 — the machine of Fig. 8.9 — and reads it back unchanged', () => {
    const machine = preset('zeros-ones').machine
    const coded = unwrap(encodeTM(machine))
    const decoded = decodeTM(coded.code)
    expect(decoded.valid).toBe(true)
    expect(decoded.rules).toHaveLength(machine.transitions.length)
    // The code names the same machine: it accepts 0ⁿ1ⁿ and nothing else.
    for (const [word, accepted] of [
      ['0011', true],
      ['000111', true],
      ['0010', false],
      ['0101', false],
      ['', false],
    ] as [string, boolean][]) {
      const trace = unwrap(simulateTM(decoded.machine, word, { maxSteps: 400 }))
      expect(trace.result, `${word} on the decoded Fig. 8.9`).toMatchObject({ type: 'acceptance', accepted })
    }
  })

  it('is deterministic — the same machine codes to the same string every time', () => {
    expect(unwrap(encodeTM(example91)).code).toBe(unwrap(encodeTM(example91)).code)
    const shuffled: TuringMachine = { ...example91, transitions: [...example91.transitions].reverse() }
    expect(unwrap(encodeTM(shuffled)).code).toBe(unwrap(encodeTM(example91)).code)
  })

  it('refuses a machine §9.1.2 does not describe', () => {
    const codeOf = (machine: TuringMachine): string | undefined => {
      const result = encodeTM(machine)
      return isErr(result) ? result.errors[0]?.code : undefined
    }

    expect(codeOf({ ...example91, accepting: ['q2', 'q3'] })).toBe('CODE_ACCEPTING_COUNT')
    expect(codeOf({ ...example91, accepting: [] })).toBe('CODE_ACCEPTING_COUNT')
    expect(codeOf({ ...example91, inputAlphabet: ['0', '1', '2'] })).toBe('CODE_INPUT_ALPHABET')
    expect(codeOf({ ...example91, tapes: 2 })).toBe('CODE_MULTITAPE')
    // q₁ is the start and q₂ accepts, so one state cannot be both.
    expect(codeOf({ ...example91, accepting: ['q1'] })).toBe('CODE_START_ACCEPTS')
    // A stationary head is legal on a multitape machine and has no code (§9.1.2).
    expect(
      codeOf({
        ...example91,
        transitions: [{ id: 's', from: 'q1', read: ['1'], to: 'q3', write: ['0'], move: ['S'] }],
      }),
    ).toBe('CODE_STATIONARY')
    // A transition naming a symbol the machine does not have.
    expect(
      codeOf({
        ...example91,
        transitions: [{ id: 'x', from: 'q1', read: ['Z'], to: 'q3', write: ['0'], move: ['R'] }],
      }),
    ).toBe('CODE_OFF_MACHINE')
  })

  it('refuses to pair a machine with something that is not a binary string', () => {
    const result = encodePair(example91, '10a1')
    expect(isErr(result) && result.errors[0]?.code).toBe('PAIR_INPUT')
    // and carries the machine's own errors through when the machine is the problem
    expect(isErr(encodePair({ ...example91, tapes: 2 }, '1011'))).toBe(true)
  })

  it('finds no pair in a string with no 111 in it', () => {
    expect(splitPair('010101010')).toBeNull()
    // The separator is the *first* 111, since no code contains one.
    expect(splitPair('0101010101110111')).toEqual({ machineCode: '010101010', word: '0111' })
  })
})

describe('every binary string is a machine — §9.1.3', () => {
  it('reads an ill-formed string as the machine with one state and no moves', () => {
    for (const bad of ['', '11001', '0010111010100', '1', '0101']) {
      const decoded = decodeTM(bad)
      expect(decoded.valid, `"${bad}" should not be a code`).toBe(false)
      expect(decoded.reason).toBeTruthy()
      expect(decoded.machine.states).toEqual(['q1'])
      expect(decoded.machine.transitions).toEqual([])
      expect(decoded.machine.accepting).toEqual([])
    }
  })

  it('gives the two non-codes the book names the reasons the book gives', () => {
    expect(decodeTM('11001').reason).toMatch(/begins with 0/)
    expect(decodeTM('0010111010100').reason).toMatch(/Three consecutive 1s/)
  })

  it('rejects a code that gives one state and symbol two different moves', () => {
    // 0¹10¹10¹10¹10¹ 11 0¹10¹10²10¹10¹ — both rules are δ(q₁, X₁), and δ is a function.
    const twice = '010101010110101001010'
    expect(decodeTM(twice).valid).toBe(false)
    expect(decodeTM(twice).reason).toMatch(/repeats a \(state, symbol\) pair/)
  })

  it('rejects a direction the book does not define', () => {
    expect(decodeTM('010101010001').valid).toBe(false)
    // 0¹10¹10¹10¹10³ — well formed but for D₃, which §9.1.2 does not define.
    expect(decodeTM('01010101000').reason).toMatch(/not a direction/)
  })

  it('finds the first well-formed code by search, not by assertion', () => {
    let first = 0
    for (let i = 1; i <= 1024 && first === 0; i++) {
      if (decodeTM(binaryString(i)).valid) first = i
    }
    expect(first).toBe(FIRST_CODE_INDEX)
    expect(binaryString(FIRST_CODE_INDEX)).toBe('010101010')
  })

  it('finds the first code that can accept anything by search', () => {
    let first = 0
    for (let i = 1; i <= 4096 && first === 0; i++) {
      const decoded = decodeTM(binaryString(i))
      if (decoded.valid && decoded.rules.some((r) => r.k === 2)) first = i
    }
    expect(first).toBe(FIRST_ACCEPTING_CODE_INDEX)
  })

  it('the first machine that can accept anything accepts exactly the strings beginning with 0', () => {
    const decoded = machineAt(FIRST_ACCEPTING_CODE_INDEX)
    expect(decoded.valid).toBe(true)
    for (let i = 1; i <= 16; i++) {
      const word = binaryString(i)
      const trace = unwrap(simulateTM(decoded.machine, word, { maxSteps: 50 }))
      expect(trace.result, `w${i} = "${word}"`).toMatchObject({
        type: 'acceptance',
        accepted: word.startsWith('0'),
      })
    }
  })
})

describe('the table of Fig. 9.1 — §9.1.3', () => {
  it('starts both axes together by default, so every row has a diagonal cell', () => {
    const table = diagonalTable({ fromRow: 1, size: 6 })
    expect(table.aligned).toBe(true)
    expect(table.fromCol).toBe(1)
    expect(table.rows).toHaveLength(6)
    expect(table.words).toHaveLength(6)
    expect(table.diagonal).toHaveLength(6)
    table.rows.forEach((row, n) => {
      expect(row.cells).toHaveLength(6)
      expect(table.diagonal[n]?.cell).toBe(row.cells[n])
    })
  })

  it('has solid 0s at the top, exactly as the footnote says', () => {
    const table = diagonalTable({ fromRow: 1, size: 16 })
    for (const row of table.rows) {
      expect(row.validCode, `w${row.index} = "${row.word}" should not be a code`).toBe(false)
      expect(new Set(row.cells), `row ${row.index}`).toEqual(new Set(['does-not-accept']))
    }
    expect(table.rows.flatMap((r) => r.cells.map(cellDigit)).join('')).toMatch(/^0+$/)
  })

  it('stays solid 0s right up to the first well-formed code', () => {
    const table = diagonalTable({ fromRow: FIRST_CODE_INDEX - 4, size: 5 })
    expect(table.rows.map((r) => r.validCode)).toEqual([false, false, false, false, true])
  })

  it('lets the axes start apart, and says so, since the interesting rows and columns are far apart', () => {
    const table = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, fromCol: 1, size: 12 })
    expect(table.aligned).toBe(false)
    expect(table.diagonal).toEqual([])
    // M₁₃₅₄ reads a 0 and accepts, so against short strings the row is legible.
    const row = table.rows[0]
    row?.cells.forEach((cell, n) => {
      const word = table.words[n]?.word as string
      expect(cell, `on w${table.words[n]?.index} = "${word}"`).toBe(
        word.startsWith('0') ? 'accepts' : 'does-not-accept',
      )
    })
  })

  it('marks a cell whose run outlives the budget, rather than guessing it', () => {
    // M₂₆₀₂ is δ(q₁, X₃) = (q₁, X₁, D₁): on the empty input it writes a 0 and
    // moves left, for ever. On anything else it has no move and dies at once.
    const table = diagonalTable({ fromRow: FIRST_NON_HALTING_CODE_INDEX, fromCol: 1, size: 8, stepBudget: 60 })
    const row = table.rows[0]
    expect(row?.validCode).toBe(true)
    expect(row?.cells[0]).toBe('unknown')
    expect(row?.cells.slice(1)).toEqual(Array<string>(7).fill('does-not-accept'))
    expect(cellDigit('unknown')).toBe('?')
  })

  it('does not change an answer it has already given when the budget grows', () => {
    const options = { fromRow: FIRST_NON_HALTING_CODE_INDEX, fromCol: 1, size: 6 }
    const small = diagonalTable({ ...options, stepBudget: 30 })
    const large = diagonalTable({ ...options, stepBudget: 400 })
    small.rows.forEach((row, i) => {
      row.cells.forEach((cell, j) => {
        if (cell !== 'unknown') expect(large.rows[i]?.cells[j], `cell (${i}, ${j})`).toBe(cell)
      })
    })
    // and the one that had no answer still has none, however long it is given
    expect(large.rows[0]?.cells[0]).toBe('unknown')
  })

  it('finds the first row that is not all 0s where encoding.ts says it is', () => {
    const before = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX - 1, fromCol: 1, size: 12 })
    expect(before.rows[0]?.cells.some((c) => c === 'accepts')).toBe(false)
    const at = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, fromCol: 1, size: 12 })
    expect(at.rows[0]?.cells.some((c) => c === 'accepts')).toBe(true)
  })

  it('complements the diagonal into membership of L_d', () => {
    const table = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, size: 8 })
    expect(table.diagonal.length).toBeGreaterThan(0)
    for (const entry of table.diagonal) {
      expect(entry.inLd).toBe(entry.cell === 'accepts' ? 'out' : entry.cell === 'does-not-accept' ? 'in' : 'unknown')
    }
  })

  it('the complemented diagonal really does differ from every row it can be compared with', () => {
    const table = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, size: 10 })
    table.diagonal.forEach((entry, n) => {
      if (entry.cell === 'unknown') return
      const rowSays = table.rows[n]?.cells[n]
      const ldSays = entry.inLd === 'in' ? 'accepts' : 'does-not-accept'
      expect(ldSays, `row ${entry.index} agrees with L_d in its own column`).not.toBe(rowSays)
    })
  })
})

describe('Theorem 9.2, walked over the computed table — §9.1.4', () => {
  const table = diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, size: 8 })
  const trace = diagonalArgument(table)

  it('holds every trace invariant', () => {
    assertTraceInvariants(trace, { finalSnapshotMatchesResult: endsIn('conclusion') })
  })

  it('reads the diagonal, complements it, then walks the rows', () => {
    expect(trace.steps.map((s) => (s.snapshot as DiagonalSnapshot).phase).slice(0, 3)).toEqual([
      'table',
      'diagonal',
      'complement',
    ])
    expect(trace.steps.filter((s) => (s.snapshot as DiagonalSnapshot).phase === 'compare')).toHaveLength(table.size)
    expect(trace.meta.counters['rowsCompared']).toBe(table.size)
  })

  it('reaches Theorem 9.2 and cites it', () => {
    const last = trace.steps.at(-1)
    expect(last?.citation).toBe('9.1.4, Thm 9.2')
    expect(last?.narration).toMatch(/not a recursively enumerable language/)
    expect(trace.result).toMatchObject({ type: 'verdict', holds: true })
  })

  it('says the theorem does not rest on the cells the table could not fill', () => {
    // A deliberately tiny budget. Every machine in the enumeration's reachable
    // range settles its own code within a few moves — M₆₈₂ takes one — so a
    // small budget is the only way to produce an unsettled *diagonal* cell, and
    // the wording that handles one is worth holding to.
    const budgeted = diagonalArgument(diagonalTable({ fromRow: FIRST_CODE_INDEX, size: 6, stepBudget: 1 }))
    expect(budgeted.steps.at(-1)?.narration).toMatch(/does not depend on the/)
    const unsettled = budgeted.steps.filter((s) => /budget ran out/.test(s.narration))
    expect(unsettled.length).toBeGreaterThan(0)
    for (const step of unsettled) expect(step.narration).not.toMatch(/disagrees/)
  })

  it('never claims to simulate an undecidable problem', () => {
    for (const step of trace.steps) expect(step.narration).not.toMatch(/\bsimulat/i)
  })

  it('says so when the diagonal is off the window, rather than inventing one', () => {
    const off = diagonalArgument(diagonalTable({ fromRow: FIRST_ACCEPTING_CODE_INDEX, fromCol: 1, size: 6 }))
    assertTraceInvariants(off, { finalSnapshotMatchesResult: endsIn('conclusion') })
    expect(off.steps).toHaveLength(2)
    expect(off.steps[1]?.narration).toMatch(/The diagonal is not on this window/)
  })

  /**
   * The argument emits one step per diagonal entry plus four, and the table caps
   * its side at 100, so it cannot reach the engine's narration cap. This holds
   * that bound, which is why `diagonalArgument` carries no step guard.
   */
  it('stays inside the trace step cap at the largest table it will build', () => {
    const biggest = diagonalArgument(diagonalTable({ fromRow: 1, size: 1000, stepBudget: 1 }))
    expect(biggest.steps.length).toBeLessThan(LIMITS.TRACE_STEPS)
    expect(biggest.meta.truncated).toBeUndefined()
  })
})

describe('reducing one problem to another — §8.1.3', () => {
  it('every reduction names real problems and starts from a hard one', () => {
    for (const r of REDUCTIONS) {
      const from = problemById(r.from)
      const to = problemById(r.to)
      expect(from, `reduction from "${r.from}"`).toBeDefined()
      expect(to, `reduction to "${r.to}"`).toBeDefined()
      expect(isKnownHard(from as never), `${r.from} must be known undecidable`).toBe(true)
      expect(r.construction.length).toBeGreaterThan(0)
      expect(r.citation).toMatch(/^[89]\./)
    }
  })

  it('every problem carries a citation, and ids are unique', () => {
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(PROBLEMS.length)
    for (const p of PROBLEMS) expect(p.citation, p.id).toMatch(/^\d/)
  })

  it('builds Example 8.1 — the hello-world problem reduced to calls-foo', () => {
    const trace = unwrap(reduce('hello-world', 'calls-foo'))
    assertTraceInvariants(trace, { finalSnapshotMatchesResult: endsIn('contradiction') })
    expect(trace.steps.map((s) => (s.snapshot as ProblemReductionSnapshot).phase)).toEqual([
      'known',
      'target',
      'assume',
      'construct',
      'construct',
      'construct',
      'construct',
      'correctness',
      'contradiction',
    ])
    expect(trace.meta.counters['constructionSteps']).toBe(4)
    expect(trace.steps[3]?.narration).toMatch(/rename it and all calls/)
  })

  it('builds both presets phases.md names', () => {
    for (const [from, to] of [
      ['hello-world', 'halting'],
      ['halting', 'l-u'],
    ] as [string, string][]) {
      const trace = unwrap(reduce(from, to))
      assertTraceInvariants(trace, { finalSnapshotMatchesResult: endsIn('contradiction') })
      expect(trace.result).toMatchObject({ type: 'verdict', holds: true })
    }
  })

  it('refuses a reduction that runs the wrong way, and gives the reason the book gives', () => {
    const result = reduce('dfa-membership', 'halting')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('REDUCTION_DIRECTION')
    expect(result.errors[0]?.message).toMatch(/true, and useless/)
    expect(result.errors[0]?.message).toMatch(/p\. 316/)
  })

  it('refuses a problem reduced to itself', () => {
    const result = reduce('halting', 'halting')
    expect(isErr(result) && result.errors[0]?.code).toBe('REDUCTION_SELF')
  })

  it('refuses to invent a construction it does not have, and says where it can go instead', () => {
    const result = reduce('hello-world', 'l-d')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('REDUCTION_NOT_CARRIED_OUT')
    for (const r of reductionsFrom('hello-world')) {
      expect(result.errors[0]?.message).toContain(problemById(r.to)?.name as string)
    }
  })

  it('names an unknown problem rather than guessing at it', () => {
    const result = reduce('penrose', 'halting')
    expect(isErr(result) && result.errors[0]?.code).toBe('REDUCTION_UNKNOWN_PROBLEM')
  })

  it('draws the conclusion the source problem actually supports — p. 380', () => {
    const strong = unwrap(reduce('l-d', 'complement-l-u'))
    expect(strong.steps.at(-1)?.narration).toMatch(/not recursively enumerable/)
    expect(strong.result).toMatchObject({ witness: { proves: 'not-re' } })

    const weak = unwrap(reduce('l-u', 'halting'))
    expect(weak.steps.at(-1)?.narration).toMatch(/is undecidable/)
    expect(weak.steps.at(-1)?.narration).toMatch(/separate question/)
    expect(weak.result).toMatchObject({ witness: { proves: 'undecidable' } })
  })

  it('never claims to simulate an undecidable problem', () => {
    for (const r of REDUCTIONS) {
      const trace = unwrap(reduce(r.from, r.to))
      for (const step of trace.steps) {
        expect(step.narration, `${r.from} to ${r.to}`).not.toMatch(/\bsimulat/i)
      }
    }
  })
})
