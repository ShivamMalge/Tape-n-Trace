/**
 * The diagonalization language — Hopcroft 2e §9.1.3 and §9.1.4.
 *
 * Fig. 9.1 is a table: row i is the Turing machine Mᵢ, column j is the string
 * wⱼ, and the cell says whether Mᵢ accepts wⱼ. Complement the diagonal and you
 * have the characteristic vector of a language that cannot be any row, which is
 * Theorem 9.2 — L_d is not recursively enumerable.
 *
 * The cells here are computed, not illustrated. Every one is a real run of a
 * real machine decoded from a real binary string, which means two things the
 * printed figure can gloss over and this cannot:
 *
 * **The top of the table is empty.** The footnote to Fig. 9.1 says so — "since
 * all low integers fail to represent a valid TM code ... the top rows of the
 * table are in fact solid 0's" — and `encoding.ts` pins where that stops: the
 * first well-formed code is w₆₈₂, and the first machine able to accept anything
 * at all is M₂₇₀₈. The table therefore starts wherever the caller asks.
 *
 * **Some cells have no answer.** A machine may run forever, so a cell is filled
 * by a run under a step budget, and a run that reaches the budget is reported as
 * unknown rather than guessed at. That is not a weakness of the display; it is
 * the subject of the chapter, visible one cell at a time.
 */

import { TraceBuilder } from '../trace.js'
import { isOk } from '../result.js'
import { simulateTM } from '../tm/simulate.js'
import type { Highlight, Step, Trace } from '../types.js'
import { binaryString, decodeTM } from './encoding.js'

/**
 * What one cell of Fig. 9.1 says.
 *
 * `does-not-accept` is the figure's 0. It covers both a machine that halts
 * without accepting and one whose every branch returned to a configuration it
 * had already been in — that machine does not halt, but it does not accept
 * either, and the table only ever asks about acceptance.
 */
export type DiagonalCell = 'accepts' | 'does-not-accept' | 'unknown'

/** The figure prints 1 and 0; a cell with no answer inside the budget prints neither. */
export function cellDigit(cell: DiagonalCell): '1' | '0' | '?' {
  return cell === 'accepts' ? '1' : cell === 'does-not-accept' ? '0' : '?'
}

export interface DiagonalRow {
  /** i. */
  index: number
  /** wᵢ, which is also the code read as Mᵢ. */
  word: string
  /** Whether wᵢ is a well-formed code (§9.1.2), or §9.1.3's machine with no moves. */
  validCode: boolean
  /** Why the code was rejected, when it was. */
  reason?: string
  /** One per column, in the table's column order. */
  cells: DiagonalCell[]
}

export interface DiagonalEntry {
  index: number
  word: string
  cell: DiagonalCell
  /** Membership of wᵢ in L_d — the complemented diagonal. */
  inLd: 'in' | 'out' | 'unknown'
}

export interface DiagonalTable {
  /** The index of the first row, and of the first column. */
  fromRow: number
  fromCol: number
  size: number
  /** Whether the axes start together, which is what puts cell (i, i) on screen for every row. */
  aligned: boolean
  /** Column headings, w_fromCol … w_(fromCol+size-1). */
  words: { index: number; word: string }[]
  rows: DiagonalRow[]
  /** Moves each cell's run was allowed before it was reported unknown. */
  stepBudget: number
  /** Cell (i, i) for every index on both axes, and what complementing it says about L_d. Empty when the axes do not overlap. */
  diagonal: DiagonalEntry[]
}

export interface DiagonalOptions {
  /**
   * The first row. Defaults to `fromCol`, so a table asked for by column alone
   * is aligned and has a full diagonal.
   */
  fromRow?: number
  /** The first column. Defaults to `fromRow`, and to 1 when neither is given. */
  fromCol?: number
  /** How many rows and columns. Defaults to 12. */
  size?: number
  /** Moves per cell. Defaults to 200. */
  stepBudget?: number
}

/** Moves one cell's run may make before the cell is reported unknown. */
export const DEFAULT_CELL_BUDGET = 200

/** Cells per side. A square of this side is 10 000 machine runs, which is already slow. */
const MAX_SIZE = 100

/**
 * Build a window on the table of Fig. 9.1.
 *
 * The two axes start independently, which the printed figure does not need to
 * bother with and a real table cannot avoid. Interesting *rows* live at large
 * indices — the first well-formed code is w₆₈₂ — while interesting *columns* are
 * short strings, because a machine's behaviour on ε or 0 is what one can read at
 * a glance. Force the axes to start together and the two never meet: the window
 * is either all 0s or full of inputs hundreds of bits long.
 *
 * Starting them together is still the default, because that is the only way cell
 * (i, i) is on screen and the diagonal is the entire point. `aligned` says which
 * kind of window this is, and `diagonal` is filled for whatever the axes share.
 */
export function diagonalTable(options: DiagonalOptions = {}): DiagonalTable {
  const clamp = (n: number): number => Math.max(1, Math.floor(n))
  const fromRow = clamp(options.fromRow ?? options.fromCol ?? 1)
  const fromCol = clamp(options.fromCol ?? options.fromRow ?? 1)
  const size = Math.min(MAX_SIZE, Math.max(1, Math.floor(options.size ?? 12)))
  const stepBudget = Math.max(1, Math.floor(options.stepBudget ?? DEFAULT_CELL_BUDGET))

  const words = Array.from({ length: size }, (_, n) => ({ index: fromCol + n, word: binaryString(fromCol + n) }))

  const rows: DiagonalRow[] = Array.from({ length: size }, (_, n) => {
    const index = fromRow + n
    const word = binaryString(index)
    const decoded = decodeTM(word)
    const cells = words.map(({ word: input }): DiagonalCell => {
      const run = simulateTM(decoded.machine, input, { maxSteps: stepBudget })
      if (!isOk(run)) return 'unknown'
      const { result } = run.value
      if (result.type === 'acceptance') return result.accepted ? 'accepts' : 'does-not-accept'
      return 'unknown'
    })
    return {
      index,
      word,
      validCode: decoded.valid,
      ...(decoded.reason === undefined ? {} : { reason: decoded.reason }),
      cells,
    }
  })

  const columnAt = new Map(words.map((entry, n) => [entry.index, n]))
  const diagonal: DiagonalEntry[] = rows.flatMap((row) => {
    const column = columnAt.get(row.index)
    if (column === undefined) return []
    const cell = row.cells[column] as DiagonalCell
    return [
      {
        index: row.index,
        word: row.word,
        cell,
        inLd: cell === 'accepts' ? ('out' as const) : cell === 'does-not-accept' ? ('in' as const) : ('unknown' as const),
      },
    ]
  })

  return { fromRow, fromCol, size, aligned: fromRow === fromCol, words, rows, stepBudget, diagonal }
}

// ---------------------------------------------------------------------------
// Theorem 9.2, walked over the table that was actually computed
// ---------------------------------------------------------------------------

export interface DiagonalSnapshot {
  table: DiagonalTable
  phase: 'table' | 'diagonal' | 'complement' | 'compare' | 'conclusion'
  /** The row the argument is comparing against, while it is comparing. */
  focus: number | null
  [key: string]: unknown
}

export type DiagonalTrace = Trace<Step<DiagonalSnapshot>>

const vector = (cells: DiagonalCell[]): string => cells.map(cellDigit).join('')

const flipped = (cell: DiagonalCell): string => (cell === 'accepts' ? '0' : cell === 'does-not-accept' ? '1' : '?')

/**
 * Theorem 9.2, step by step, on the table the caller built.
 *
 * The steps walk the rows that are on screen, because seeing the complemented
 * diagonal disagree with a row you can point at is the whole intuition. The
 * conclusion is careful to say that the argument is not the walk: the theorem is
 * about every i, and no table of any size would establish it.
 */
export function diagonalArgument(table: DiagonalTable): DiagonalTrace {
  const builder = new TraceBuilder<DiagonalSnapshot>('decide.diagonalization', {
    fromRow: table.fromRow,
    fromCol: table.fromCol,
    size: table.size,
    stepBudget: table.stepBudget,
  })

  const at = (phase: DiagonalSnapshot['phase'], focus: number | null): DiagonalSnapshot => ({ table, phase, focus })
  const diagonalCells = table.diagonal.map((entry) => entry.cell)
  const unknowns = table.diagonal.filter((entry) => entry.cell === 'unknown').length

  builder.step({
    narration: `Row i of the table is the characteristic vector of L(Mᵢ): the cell in column j is 1 when Mᵢ accepts wⱼ and 0 when it does not. Rows ${table.fromRow} to ${table.fromRow + table.size - 1} are shown against columns ${table.fromCol} to ${table.fromCol + table.size - 1}, each cell run for at most ${table.stepBudget} moves.`,
    citation: '9.1.3',
    highlight: [],
    snapshot: at('table', null),
  })

  if (table.diagonal.length === 0) {
    builder.step({
      narration: `The diagonal is not on this window: it is made of the cells (i, i), and no index appears on both axes here. Start the rows and the columns at the same place to bring it into view.`,
      citation: '9.1.3',
      highlight: [],
      snapshot: at('conclusion', null),
    })
    return builder.build({
      type: 'verdict',
      holds: true,
      witness: { theorem: '9.2', claim: 'L_d is not a recursively enumerable language.' },
    })
  }

  builder.step({
    narration: `Read the diagonal — cell (i, i) for each row, which asks whether Mᵢ accepts its own code. Over these rows it reads ${vector(diagonalCells)}.`,
    citation: '9.1.3',
    highlight: table.diagonal.map((entry) => ({
      type: 'tableCell' as const,
      row: String(entry.index),
      col: String(entry.index),
      role: 'marked' as const,
    })),
    snapshot: at('diagonal', null),
  })

  builder.step({
    narration: `Complement it: ${table.diagonal.map((entry) => flipped(entry.cell)).join('')}. That vector is the characteristic vector of L_d, the set of wᵢ that Mᵢ does not accept.`,
    citation: '9.1.3',
    highlight: table.diagonal.map((entry) => ({
      type: 'tableCell' as const,
      row: String(entry.index),
      col: String(entry.index),
      role: 'witness' as const,
    })),
    snapshot: at('complement', null),
  })

  // No step guard here, unlike every other trace in the engine. One step is
  // emitted per diagonal entry plus four, and `MAX_SIZE` caps the diagonal at
  // 100, so a trace cannot reach `LIMITS.TRACE_STEPS`. A guard that can never
  // fire is not a safety net, it is an untested branch — the test holds the
  // bound instead.
  for (const entry of table.diagonal) {
    const highlight: Highlight[] = [
      { type: 'tableCell', row: String(entry.index), col: String(entry.index), role: 'witness' },
    ]
    builder.bump('rowsCompared')
    builder.step({
      narration:
        entry.cell === 'unknown'
          ? `Row ${entry.index}: M${entry.index} was still running on its own code when the ${table.stepBudget}-move budget ran out, so this row cannot be settled on screen. The proof does not need it settled — it needs only that the answer is one or the other, which it is.`
          : entry.cell === 'accepts'
            ? `Row ${entry.index}: M${entry.index} accepts its own code, so cell (${entry.index}, ${entry.index}) is 1 while the complemented diagonal is 0 there. L_d disagrees with L(M${entry.index}) on w${entry.index}, so L_d is not that row.`
            : `Row ${entry.index}: M${entry.index} does not accept its own code, so cell (${entry.index}, ${entry.index}) is 0 while the complemented diagonal is 1 there. L_d disagrees with L(M${entry.index}) on w${entry.index}, so L_d is not that row.`,
      citation: '9.1.4, Thm 9.2',
      highlight,
      snapshot: at('compare', entry.index),
    })
  }

  builder.step({
    narration: `Every row disagrees with the complemented diagonal in its own column, and every Turing machine with input alphabet {0, 1} is some row. So no Turing machine accepts L_d: it is not a recursively enumerable language, which is Theorem 9.2.${
      unknowns > 0
        ? ` The argument does not depend on the ${unknowns === 1 ? 'cell' : `${unknowns} cells`} this table could not fill — it needs only that each has an answer, not that the answer is known.`
        : ''
    }`,
    citation: '9.1.4, Thm 9.2',
    highlight: [],
    snapshot: at('conclusion', null),
  })

  return builder.build({
    type: 'verdict',
    holds: true,
    witness: { theorem: '9.2', claim: 'L_d is not a recursively enumerable language.' },
  })
}
