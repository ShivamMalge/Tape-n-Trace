/**
 * Chomsky Normal Form — Hopcroft 2e §7.1.5, Theorem 7.16.
 *
 * Two tasks, once the grammar has no ε-productions, unit productions or
 * useless symbols (Theorem 7.14's preliminaries — this module refuses a
 * grammar that skipped them, naming the offender):
 *
 *   (a) every body of length ≥ 2 is made all-variables, by giving each
 *       terminal a variable of its own with the single production A → a;
 *   (b) every body of length ≥ 3 is broken into a cascade of two-variable
 *       bodies, one chain per distinct body, exactly as Example 7.15 shares
 *       C₂ between E → TMF and T → TMF.
 *
 * New variables are named systematically: the terminal's own letter in upper
 * case when that is free (A → a, B → b, as the book does), X1, X2, … otherwise;
 * cascade variables are C1, C2, … in order of first appearance.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { productionToText } from './parse.js'
import { generatingSymbols, reachableSymbols } from './useless.js'
import { isUnitProduction } from './unitProd.js'
import type { CFG, Production, Step, Trace } from '../types.js'

export interface CnfSnapshot {
  grammar: CFG
  status: 'running' | 'done'
  [key: string]: unknown
}

export type CnfTrace = Trace<Step<CnfSnapshot>>

/** Whether every production is A → BC or A → a. */
export function isCNF(grammar: CFG): boolean {
  const variables = new Set(grammar.variables)
  return grammar.productions.every((p) => {
    if (p.body.length === 1) return !variables.has(p.body[0] as string)
    if (p.body.length === 2) return p.body.every((s) => variables.has(s))
    return false
  })
}

/** The problems Theorem 7.14's preliminaries would have removed — all of them at once. */
export function cnfPreconditions(grammar: CFG): ValidationError[] {
  const problems: ValidationError[] = []
  grammar.productions.forEach((p) => {
    if (p.body.length === 0) {
      problems.push(
        validationError('CNF_EPSILON', `${productionToText(p)} is an ε-production. Eliminate ε-productions first — that is step 1 of the safe order.`, {
          kind: 'production',
        }),
      )
    } else if (isUnitProduction(p, grammar)) {
      problems.push(
        validationError('CNF_UNIT', `${productionToText(p)} is a unit production. Eliminate unit productions first — step 2 of the safe order.`, {
          kind: 'production',
        }),
      )
    }
  })
  const generating = generatingSymbols(grammar)
  const reachable = reachableSymbols(grammar)
  const useless = [...grammar.variables, ...grammar.terminals].filter((s) => !generating.has(s) || !reachable.has(s))
  if (useless.length > 0) {
    problems.push(
      validationError('CNF_USELESS', `${useless.join(', ')} ${useless.length === 1 ? 'is' : 'are'} useless. Eliminate useless symbols first — step 3 of the safe order.`, {
        kind: 'production',
      }),
    )
  }
  return problems
}

function freshName(preferred: string[], fallbackBase: string, used: Set<string>): string {
  for (const candidate of preferred) {
    if (!used.has(candidate)) return candidate
  }
  for (let n = 1; ; n++) {
    const candidate = `${fallbackBase}${n}`
    if (!used.has(candidate)) return candidate
  }
}

export function toCNF(grammar: CFG): Result<CnfTrace> {
  const problems = cnfPreconditions(grammar)
  if (problems.length > 0) return err(problems)

  const builder = new TraceBuilder<CnfSnapshot>('grammar.cnf', { grammar })
  const snap = (g: CFG, status: 'running' | 'done'): CnfSnapshot => ({ grammar: g, status })

  if (isCNF(grammar)) {
    builder.step({
      narration: `Every production is already of the form A → BC or A → a: the grammar is in Chomsky Normal Form.`,
      citation: '7.1.5',
      highlight: [],
      snapshot: snap(grammar, 'done'),
    })
    return ok(builder.build({ type: 'grammar', grammar }))
  }

  const used = new Set<string>([...grammar.variables, ...grammar.terminals])
  const variables = new Set(grammar.variables)
  let current: CFG = { ...grammar, productions: grammar.productions.map((p) => ({ head: p.head, body: [...p.body] })) }

  builder.step({
    narration: `The grammar has no ε-productions, unit productions or useless symbols, so every production is either A → a already or has a body of length 2 or more. Two tasks remain: make every long body all-variables, then break bodies of length 3 or more into pairs.`,
    citation: '7.1.5, Thm 7.16',
    highlight: [],
    snapshot: snap(current, 'running'),
  })

  // (a) Terminal isolation, in order of first appearance in a long body.
  const terminalVariable = new Map<string, string>()
  for (const p of current.productions) {
    if (p.body.length < 2) continue
    for (const symbol of p.body) {
      if (variables.has(symbol) || terminalVariable.has(symbol)) continue
      const preferred = /^[a-z]$/.test(symbol) ? [symbol.toUpperCase()] : []
      const name = freshName(preferred, 'X', used)
      used.add(name)
      terminalVariable.set(symbol, name)
    }
  }

  for (const [terminal, variable] of terminalVariable) {
    const touched: number[] = []
    const productions = current.productions.map((p, index) => {
      if (p.body.length < 2 || !p.body.includes(terminal)) return p
      touched.push(index)
      return { head: p.head, body: p.body.map((s) => (s === terminal ? variable : s)) }
    })
    current = {
      ...current,
      variables: [...current.variables, variable],
      productions: [...productions, { head: variable, body: [terminal] }],
    }
    builder.step({
      narration: `The terminal ${terminal} appears in ${touched.length === 1 ? 'a body' : `${touched.length} bodies`} of length 2 or more. A new variable ${variable} with the single production ${variable} → ${terminal} stands in for it there.`,
      citation: '7.1.5',
      highlight: [
        { type: 'production', index: current.productions.length - 1, role: 'added' },
        ...touched.map((index) => ({ type: 'production' as const, index, role: 'applied' as const })),
      ],
      snapshot: snap(current, 'running'),
    })
  }

  // (b) Binarisation — one cascade per distinct body, shared by every head that uses it.
  const chains = new Map<string, string>()
  let cascade = 1
  let cascadeCreated = 0
  const bodies = current.productions.filter((p) => p.body.length >= 3).map((p) => p.body.join(' '))
  for (const key of [...new Set(bodies)]) {
    const body = key.split(' ')
    const k = body.length
    const names: string[] = []
    for (let i = 0; i < k - 2; i++) {
      let name = `C${cascade}`
      while (used.has(name)) {
        cascade++
        name = `C${cascade}`
      }
      used.add(name)
      cascade++
      cascadeCreated++
      names.push(name)
    }
    chains.set(key, names[0] as string)

    const chainProductions: Production[] = names.map((name, i) => ({
      head: name,
      body: i === names.length - 1 ? [body[i + 1] as string, body[i + 2] as string] : [body[i + 1] as string, names[i + 1] as string],
    }))

    const touched: number[] = []
    const productions = current.productions.map((p, index) => {
      if (p.body.join(' ') !== key) return p
      touched.push(index)
      return { head: p.head, body: [body[0] as string, names[0] as string] }
    })
    current = {
      ...current,
      variables: [...current.variables, ...names],
      productions: [...productions, ...chainProductions],
    }
    const heads = touched.map((index) => (current.productions[index] as Production).head)
    builder.step({
      narration: `The body ${body.join(' ')} has length ${k}. New variable${names.length === 1 ? '' : 's'} ${names.join(', ')} break${names.length === 1 ? 's' : ''} it into pairs: ${heads.map((h) => `${h} → ${body[0]} ${names[0]}`).join(', ')}, ${chainProductions.map((p) => productionToText(p)).join(', ')}.${
        touched.length > 1 ? ` One chain serves all ${touched.length} productions with this body.` : ''
      }`,
      citation: '7.1.5',
      highlight: [
        ...touched.map((index) => ({ type: 'production' as const, index, role: 'applied' as const })),
        ...chainProductions.map((_, i) => ({ type: 'production' as const, index: productions.length + i, role: 'added' as const })),
      ],
      snapshot: snap(current, 'running'),
    })
  }

  builder.step({
    narration: `Every production is now A → BC or A → a: the grammar is in Chomsky Normal Form, and it generates the same language (Theorem 7.16).`,
    citation: '7.1.5, Thm 7.16',
    highlight: [],
    snapshot: snap(current, 'done'),
  })

  builder.bump('variablesAdded', terminalVariable.size + cascadeCreated)
  return ok(builder.build({ type: 'grammar', grammar: current }))
}
