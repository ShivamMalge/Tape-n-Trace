/**
 * The PDA editor's text form.
 *
 * One transition per line, written the way the book writes δ:
 *
 *     q0, a, Z0 -> q0, AZ0
 *
 * reads "in q0, reading a with Z0 on top, go to q0 and push AZ0". ε (or `eps`)
 * stands for reading nothing, and as the push means push nothing. The states
 * and both alphabets are inferred from the transitions; start, start stack and
 * acceptance mode are separate fields on the page.
 *
 * A pushed string with spaces is split on them; without spaces it splits into
 * letter-plus-digits chunks, so `AZ0` means A then Z0 — the convention the
 * textbook's stack symbols (Z0, X0, A, …) already follow.
 *
 * Every problem is reported at once, each with the character offset of its
 * line, per the engine's Result contract.
 */

import { pdaTransitionId } from '@tape-n-trace/engine'
import type { PDA, PDATransition, Read, Result, Sym, ValidationError } from '@tape-n-trace/engine'

const EPSILON_WORDS = new Set(['ε', 'eps', 'epsilon', 'λ'])

export interface PdaHeader {
  start: string
  startStack: string
  accepting: string[]
  acceptBy: PDA['acceptBy']
}

function isEpsilon(token: string): boolean {
  return EPSILON_WORDS.has(token)
}

/** Split a pushed string into stack symbols. Exported for the help text's tests. */
export function splitPush(text: string): Sym[] {
  const trimmed = text.trim()
  if (trimmed === '' || isEpsilon(trimmed)) return []
  if (/\s/.test(trimmed)) return trimmed.split(/\s+/)
  return trimmed.match(/\D\d*|\d/g) ?? []
}

function positioned(code: string, message: string, position: number): ValidationError {
  return { code, message, subject: { kind: 'transition' }, position }
}

export function parsePdaText(source: string, header: PdaHeader): Result<PDA> {
  const errors: ValidationError[] = []
  const transitions: PDATransition[] = []
  const seenIds = new Set<string>()

  let offset = 0
  for (const line of source.split('\n')) {
    const at = offset
    offset += line.length + 1
    const text = line.trim()
    if (text === '' || text.startsWith('#')) continue

    const arrow = text.indexOf('->')
    if (arrow === -1) {
      errors.push(positioned('PDA_LINE_NO_ARROW', `"${text}" has no "->".`, at))
      continue
    }

    const lhs = text.slice(0, arrow).split(',').map((part) => part.trim())
    const rhs = text.slice(arrow + 2).split(',').map((part) => part.trim())

    if (lhs.length !== 3 || lhs.some((part) => part === '')) {
      errors.push(
        positioned('PDA_LINE_BAD_LHS', `The left side of "${text}" must be "state, read, pop" — three comma-separated parts.`, at),
      )
      continue
    }
    if (rhs.length > 2 || rhs[0] === '' || (rhs.length === 2 && rhs[1] === '')) {
      errors.push(
        positioned('PDA_LINE_BAD_RHS', `The right side of "${text}" must be "state, push" — the push may be omitted for ε.`, at),
      )
      continue
    }

    const [from, readText, popText] = lhs as [string, string, string]
    const to = rhs[0] as string
    const read: Read = isEpsilon(readText) ? null : readText
    const pop: Read = isEpsilon(popText) ? null : popText
    const push = splitPush(rhs[1] ?? 'ε')

    const id = pdaTransitionId(from, read, pop, push, to)
    if (seenIds.has(id)) {
      errors.push(positioned('PDA_LINE_DUPLICATE', `"${text}" repeats an earlier transition.`, at))
      continue
    }
    seenIds.add(id)
    transitions.push({ id, from, read, pop, to, push })
  }

  if (header.start.trim() === '') {
    errors.push({ code: 'PDA_NO_START', message: 'Name a start state.', subject: { kind: 'machine' } })
  }
  if (header.startStack.trim() === '') {
    errors.push({ code: 'PDA_NO_START_STACK', message: 'Name a start stack symbol.', subject: { kind: 'machine' } })
  }
  if (transitions.length === 0 && errors.length === 0) {
    errors.push({ code: 'PDA_EMPTY', message: 'Write at least one transition.', subject: { kind: 'machine' } })
  }

  if (errors.length > 0) return { ok: false, errors }

  const start = header.start.trim()
  const startStack = header.startStack.trim()
  const accepting = header.accepting.map((s) => s.trim()).filter((s) => s !== '')

  const states = [...new Set([start, ...accepting, ...transitions.flatMap((t) => [t.from, t.to])])]
  const inputAlphabet = [...new Set(transitions.flatMap((t) => (t.read === null ? [] : [t.read])))]
  const stackAlphabet = [
    ...new Set([startStack, ...transitions.flatMap((t) => [...(t.pop === null ? [] : [t.pop]), ...t.push])]),
  ]

  return {
    ok: true,
    value: { states, inputAlphabet, stackAlphabet, transitions, start, startStack, accepting, acceptBy: header.acceptBy },
  }
}

/** The text form of a machine, for loading a preset into the editor. */
export function pdaToText(pda: PDA): string {
  return pda.transitions
    .map((t) => {
      const push = t.push.length === 0 ? 'ε' : t.push.join(' ')
      return `${t.from}, ${t.read ?? 'ε'}, ${t.pop ?? 'ε'} -> ${t.to}, ${push}`
    })
    .join('\n')
}
