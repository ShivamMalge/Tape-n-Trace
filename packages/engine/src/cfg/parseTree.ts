/**
 * Parse trees — Hopcroft 2e §5.2.
 *
 * The tree grows alongside the derivation, one interior node per applied
 * production, and its yield read across the leaves is the derived string —
 * the correspondence of §5.2.3–5.2.6, held as a data-structure invariant and
 * property-tested rather than asserted in prose.
 */

import type { CFG, Production } from '../types.js'

export interface CfgTreeNode {
  id: string
  /** The grammar symbol at this node, or 'ε' for an epsilon leaf. */
  symbol: string
  children: string[]
  parent: string | null
}

/** The leaves in left-to-right order, ε leaves contributing nothing. */
export function treeYield(nodes: readonly CfgTreeNode[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const root = nodes.find((n) => n.parent === null)
  if (root === undefined) return []

  const leaves: string[] = []
  const walk = (node: CfgTreeNode): void => {
    if (node.children.length === 0) {
      if (node.symbol !== 'ε') leaves.push(node.symbol)
      return
    }
    for (const id of node.children) {
      const child = byId.get(id)
      if (child !== undefined) walk(child)
    }
  }
  walk(root)
  return leaves
}

/**
 * A derivation replayed into its tree.
 *
 * `steps` are (production index, position) pairs: at each step the production
 * is applied to the variable at `position` among the *current* sentential
 * form's symbols. The builder tracks which tree node each sentential position
 * corresponds to, so the tree and the strip can never drift apart.
 */
export interface TreeBuilder {
  nodes: CfgTreeNode[]
  /** Tree node id for each position of the current sentential form. */
  frontier: string[]
  sentential: string[]
}

export function startTree(startSymbol: string): TreeBuilder {
  const root: CfgTreeNode = { id: 'n0', symbol: startSymbol, children: [], parent: null }
  return { nodes: [root], frontier: ['n0'], sentential: [startSymbol] }
}

/** Apply a production at a sentential position; returns a new builder (ADR-001). */
export function applyToTree(
  builder: TreeBuilder,
  production: Production,
  position: number,
): TreeBuilder {
  const nodeId = builder.frontier[position]
  if (nodeId === undefined) return builder

  const base = builder.nodes.length
  const childIds =
    production.body.length === 0
      ? [`n${base}`]
      : production.body.map((_, i) => `n${base + i}`)

  const children: CfgTreeNode[] =
    production.body.length === 0
      ? [{ id: childIds[0] as string, symbol: 'ε', children: [], parent: nodeId }]
      : production.body.map((symbol, i) => ({
          id: childIds[i] as string,
          symbol,
          children: [],
          parent: nodeId,
        }))

  const nodes = [
    ...builder.nodes.map((n) => (n.id === nodeId ? { ...n, children: childIds } : n)),
    ...children,
  ]

  // An ε-production removes the position from the strip; anything else replaces
  // it with the body's symbols.
  const replacementIds = production.body.length === 0 ? [] : childIds
  const replacementSymbols = production.body.length === 0 ? [] : production.body

  return {
    nodes,
    frontier: [
      ...builder.frontier.slice(0, position),
      ...replacementIds,
      ...builder.frontier.slice(position + 1),
    ],
    sentential: [
      ...builder.sentential.slice(0, position),
      ...replacementSymbols,
      ...builder.sentential.slice(position + 1),
    ],
  }
}

/** Positions in the sentential form that hold variables. */
export function variablePositions(grammar: CFG, sentential: readonly string[]): number[] {
  const variables = new Set(grammar.variables)
  return sentential.flatMap((symbol, i) => (variables.has(symbol) ? [i] : []))
}
