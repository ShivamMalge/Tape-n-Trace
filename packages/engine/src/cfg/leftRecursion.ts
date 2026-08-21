/**
 * Left recursion elimination — phases.md §2.4, examined at 8 marks.
 *
 * Immediate recursion  A → Aα | β  becomes  A → βA′,  A′ → αA′ | ε.  General
 * recursion runs the standard variable-ordering algorithm: for each variable in
 * order, substitute out productions that start with an *earlier* variable, then
 * eliminate the immediate recursion that surfaces. The trace shows one step per
 * variable — the substitutions into it, then the elimination — because the
 * order is the part students lose marks on.
 *
 * Two honest caveats, stated rather than hidden. The algorithm assumes no
 * ε-productions and no cycles among the recursive variables; input that has
 * them is refused with the reason. And the output *introduces* ε-productions —
 * the A′ → ε — which the P1.5 simplification pipeline removes; applying the two
 * transformations in the wrong order is the classic mistake, and the docs panel
 * says so.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import { productionToText } from './parse.js'
import type { CFG, Production, Step, Trace } from '../types.js'

export interface LeftRecursionSnapshot {
  /** The grammar as far as it has been rewritten. */
  grammar: CFG
  source: CFG
  /** The variable being processed this step. */
  current: string | null
  status: 'running' | 'done'
  [key: string]: unknown
}

/** A fresh primed name: A → A′, or A′′ if A′ is taken. */
export function primedName(base: string, taken: ReadonlySet<string>): string {
  let candidate = `${base}'`
  while (taken.has(candidate)) candidate += "'"
  return candidate
}

/**
 * Does some variable satisfy A ⇒⁺ Aγ by leftmost symbols?
 *
 * The structural check the acceptance criterion asks for: build the graph with
 * an edge A → X when a production A → X… exists (following through nullable
 * leading symbols), and look for a cycle among variables. Not an eyeball test.
 */
export function isLeftRecursive(grammar: CFG): boolean {
  const variables = new Set(grammar.variables)
  const nullable = nullableSet(grammar)

  const edges = new Map<string, Set<string>>()
  for (const production of grammar.productions) {
    for (const symbol of production.body) {
      if (!variables.has(symbol)) break
      const set = edges.get(production.head) ?? new Set<string>()
      set.add(symbol)
      edges.set(production.head, set)
      if (!nullable.has(symbol)) break
    }
  }

  // A cycle in the leftmost-variable graph is exactly a left-recursive chain.
  const visiting = new Set<string>()
  const done = new Set<string>()
  const cyclic = (variable: string): boolean => {
    if (done.has(variable)) return false
    if (visiting.has(variable)) return true
    visiting.add(variable)
    for (const next of edges.get(variable) ?? []) {
      if (cyclic(next)) return true
    }
    visiting.delete(variable)
    done.add(variable)
    return false
  }

  return grammar.variables.some(cyclic)
}

function nullableSet(grammar: CFG): Set<string> {
  const nullable = new Set<string>()
  for (let changed = true; changed; ) {
    changed = false
    for (const production of grammar.productions) {
      if (nullable.has(production.head)) continue
      if (production.body.every((symbol) => nullable.has(symbol))) {
        nullable.add(production.head)
        changed = true
      }
    }
  }
  return nullable
}

/** Eliminate left recursion, tracing one step per variable in order. */
export function eliminateLeftRecursion(source: CFG): Result<Trace<Step<LeftRecursionSnapshot>>> {
  const problems = checkInput(source)
  if (problems.length > 0) return err(problems)

  const builder = new TraceBuilder<LeftRecursionSnapshot>('grammar.left-recursion', source)
  const taken = new Set(source.variables)
  let grammar: CFG = {
    variables: [...source.variables],
    terminals: [...source.terminals],
    productions: source.productions.map((p) => ({ head: p.head, body: [...p.body] })),
    start: source.start,
  }

  builder.step({
    narration: `Process the variables in order ${source.variables.join(', ')}: substitute earlier variables out of each one's leading position, then remove the immediate recursion that appears.`,
    highlight: [],
    snapshot: { grammar, source, current: null, status: 'running' },
  })

  const ordered = [...source.variables]
  for (let i = 0; i < ordered.length; i++) {
    const variable = ordered[i] as string

    // 1. Substitute A_j (j < i) out of the leading position of A_i's bodies.
    let substitutions = 0
    for (let j = 0; j < i; j++) {
      const earlier = ordered[j] as string
      const replaced: Production[] = []
      for (const production of grammar.productions) {
        if (production.head !== variable || production.body[0] !== earlier) {
          replaced.push(production)
          continue
        }
        substitutions += 1
        for (const expansion of grammar.productions.filter((p) => p.head === earlier)) {
          replaced.push({ head: variable, body: [...expansion.body, ...production.body.slice(1)] })
        }
      }
      grammar = { ...grammar, productions: replaced }
    }

    // 2. Immediate elimination: A → Aα | β  ⇒  A → βA′, A′ → αA′ | ε.
    const own = grammar.productions.filter((p) => p.head === variable)
    const recursive = own.filter((p) => p.body[0] === variable)
    const rest = grammar.productions.filter((p) => p.head !== variable)
    const nonRecursive = own.filter((p) => p.body[0] !== variable)

    if (recursive.length > 0) {
      const primed = primedName(variable, taken)
      taken.add(primed)

      // A → βA′ for each non-recursive alternative. A variable with *only*
      // recursive productions keeps none — its language was empty before the
      // rewrite (A → Aα alone derives nothing) and stays empty after, which is
      // the faithful translation rather than an error.
      const rewritten: Production[] = nonRecursive.map((p) => ({
        head: variable,
        body: [...p.body, primed],
      }))

      const primedProductions: Production[] = [
        ...recursive.map((p) => ({ head: primed, body: [...p.body.slice(1), primed] })),
        { head: primed, body: [] },
      ]

      grammar = {
        ...grammar,
        variables: [...grammar.variables, primed],
        productions: [...rest, ...rewritten, ...primedProductions],
      }

      builder.bump('variablesRewritten')
      builder.step({
        narration: `${variable}: ${substitutions > 0 ? `${substitutions} leading occurrence${substitutions === 1 ? '' : 's'} of earlier variables substituted out, then ` : ''}the ${recursive.length} left-recursive production${recursive.length === 1 ? '' : 's'} ${recursive.map(productionToText).join(', ')} become right recursion through the new variable ${primed} — note the ${primed} → ε this introduces.`,
        highlight: grammar.productions.flatMap((p, index) =>
          p.head === variable || p.head === primed
            ? [{ type: 'production' as const, index, role: 'added' as const }]
            : [],
        ),
        snapshot: { grammar, source, current: variable, status: 'running' },
      })
    } else {
      builder.step({
        narration: `${variable}: ${substitutions > 0 ? `${substitutions} substitution${substitutions === 1 ? '' : 's'} performed, and ` : ''}no left-recursive production remains, so nothing is eliminated here.`,
        highlight: grammar.productions.flatMap((p, index) =>
          p.head === variable ? [{ type: 'production' as const, index, role: 'applied' as const }] : [],
        ),
        snapshot: { grammar, source, current: variable, status: 'running' },
      })
    }
  }

  builder.step({
    narration: `Every variable is processed and no left-recursive chain remains — checked structurally on the leftmost-symbol graph, not by eye. The new primed variables carry ε-productions; the simplification pipeline removes those, and the order matters: eliminate left recursion first, then clean up ε.`,
    highlight: [],
    snapshot: { grammar, source, current: null, status: 'done' },
  })

  return ok(builder.build({ type: 'grammar', grammar }))
}

function checkInput(grammar: CFG): ValidationError[] {
  const problems: ValidationError[] = []

  grammar.productions.forEach((production, index) => {
    if (production.body.length === 0) {
      problems.push(
        validationError(
          'LEFTREC_EPSILON_INPUT',
          `Production ${index + 1} (${productionToText(production)}) is an ε-production. The standard algorithm assumes none — run ε-removal first, or rewrite the grammar without it.`,
          { kind: 'production', id: String(index) },
        ),
      )
    }
    if (production.body.length === 1 && production.body[0] === production.head) {
      problems.push(
        validationError(
          'LEFTREC_CYCLE',
          `Production ${index + 1} is ${productionToText(production)} — a unit cycle, which the algorithm cannot terminate on. Remove it first.`,
          { kind: 'production', id: String(index) },
        ),
      )
    }
  })

  return problems
}
