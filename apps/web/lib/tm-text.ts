/**
 * The Turing-machine editor's text form.
 *
 * One move per line, written the way the book tabulates δ:
 *
 *     q0, 0 -> q1, X, R
 *
 * reads "δ(q0, 0) = (q1, X, R)". A multitape machine lists one symbol per
 * tape, space separated, on both sides and in the move: `p0, 0 B -> p0, 0 0, R R`.
 * Moves are L, R or — on a multitape machine only — S. The states and the tape
 * alphabet are inferred; start, accepting states, blank and input symbols are
 * fields beside the box. Every problem is reported at once, positioned.
 */

import { tmTransitionId } from '@tape-n-trace/engine'
import type { Result, TMTransition, TuringMachine, ValidationError } from '@tape-n-trace/engine'

export interface TmHeader {
  start: string
  accepting: string[]
  blank: string
  inputAlphabet: string[]
}

function positioned(code: string, message: string, position: number): ValidationError {
  return { code, message, subject: { kind: 'transition' }, position }
}

/** Split on commas outside brackets, so a state named [q1, 0] (Example 8.6) survives. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '[') depth++
    if (ch === ']') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current.trim())
  return parts
}

const clean = (list: readonly string[]): string[] => list.map((s) => s.trim()).filter((s) => s !== '')

export function parseTmText(source: string, header: TmHeader): Result<TuringMachine> {
  const errors: ValidationError[] = []
  const transitions: TMTransition[] = []
  const seen = new Set<string>()
  let tapes: number | null = null

  let offset = 0
  for (const line of source.split('\n')) {
    const at = offset
    offset += line.length + 1
    const text = line.trim()
    if (text === '' || text.startsWith('#')) continue

    const arrow = text.indexOf('->')
    if (arrow === -1) {
      errors.push(positioned('TM_LINE_NO_ARROW', `"${text}" has no "->".`, at))
      continue
    }
    const lhs = splitTopLevel(text.slice(0, arrow))
    const rhs = splitTopLevel(text.slice(arrow + 2))
    if (lhs.length !== 2 || lhs.some((p) => p === '')) {
      errors.push(positioned('TM_LINE_BAD_LHS', `The left side of "${text}" must be "state, symbols read".`, at))
      continue
    }
    if (rhs.length !== 3 || rhs.some((p) => p === '')) {
      errors.push(positioned('TM_LINE_BAD_RHS', `The right side of "${text}" must be "state, symbols written, moves".`, at))
      continue
    }
    const [from, readText] = lhs as [string, string]
    const [to, writeText, moveText] = rhs as [string, string, string]
    const read = clean(readText.split(/\s+/))
    const write = clean(writeText.split(/\s+/))
    const move = clean(moveText.split(/\s+/)).map((m) => m.toUpperCase())

    if (tapes === null) tapes = read.length
    if (read.length !== tapes || write.length !== tapes || move.length !== tapes) {
      errors.push(positioned('TM_LINE_ARITY', `"${text}" does not give one read, one write and one move for each of the ${tapes} tape${tapes === 1 ? '' : 's'}.`, at))
      continue
    }
    const badMove = move.find((m) => !['L', 'R', 'S'].includes(m))
    if (badMove !== undefined) {
      errors.push(positioned('TM_LINE_BAD_MOVE', `"${badMove}" is not a move; use L, R or (multitape only) S.`, at))
      continue
    }

    const id = tmTransitionId(from, read, write, move, to)
    if (seen.has(id)) {
      errors.push(positioned('TM_LINE_DUPLICATE', `"${text}" repeats an earlier move.`, at))
      continue
    }
    seen.add(id)
    transitions.push({ id, from, read, to, write, move: move as ('L' | 'R' | 'S')[] })
  }

  if (header.start.trim() === '') errors.push({ code: 'TM_NO_START', message: 'Name a start state.', subject: { kind: 'machine' } })
  if (header.blank.trim() === '') errors.push({ code: 'TM_NO_BLANK', message: 'Name the blank symbol.', subject: { kind: 'machine' } })
  if (transitions.length === 0 && errors.length === 0) {
    errors.push({ code: 'TM_EMPTY', message: 'Write at least one move.', subject: { kind: 'machine' } })
  }
  if (errors.length > 0) return { ok: false, errors }

  const start = header.start.trim()
  const blank = header.blank.trim()
  const accepting = clean(header.accepting)
  const inputAlphabet = clean(header.inputAlphabet)
  const states = [...new Set([start, ...transitions.flatMap((t) => [t.from, t.to]), ...accepting])]
  const tapeAlphabet = [...new Set([...inputAlphabet, ...transitions.flatMap((t) => [...t.read, ...t.write]), blank])]

  return {
    ok: true,
    value: { states, inputAlphabet, tapeAlphabet, blank, transitions, start, accepting, tapes: tapes ?? 1 },
  }
}

/** The text form of a machine, for loading a preset into the editor. */
export function tmToText(machine: TuringMachine): string {
  return machine.transitions
    .map((t) => `${t.from}, ${t.read.join(' ')} -> ${t.to}, ${t.write.join(' ')}, ${t.move.join(' ')}`)
    .join('\n')
}
