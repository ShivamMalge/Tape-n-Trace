/**
 * The regular-expression parse tree.
 *
 * Thompson's construction walks this tree bottom-up, so the tree is how a
 * student sees *why* the fragments appear in the order they do — the automaton
 * on its own only shows the result. The node being built is highlighted as the
 * trace steps, which is the pairing that makes the construction readable.
 *
 * Laid out by depth, with leaves spread evenly and each parent centred over its
 * children. Deterministic, so a snapshot test of it means something.
 */

import type { Step } from '@tape-n-trace/engine'
import { indexHighlights, type TreeNodeRole } from '../automaton/highlights.js'

/** Mirrors the engine's `RegexTreeNode`, kept structural so this stays type-only. */
export interface ParseTreeNode {
  id: string
  op: string
  label: string
  children: string[]
  parent: string | null
}

export interface ParseTreeProps {
  nodes: readonly ParseTreeNode[]
  step?: Step | null | undefined
  className?: string
  /** The most the tree may be scaled up from its own coordinates (a notebook cell asks for less). */
  maxScale?: number | undefined
}

const LEVEL_GAP = 56
const LEAF_GAP = 62
const RADIUS = 15

export function ParseTree({ nodes, step = null, className, maxScale = 1.5 }: ParseTreeProps): React.JSX.Element {
  const highlights = indexHighlights(step?.highlight)
  const placed = layout(nodes)
  const byId = new Map(placed.map((n) => [n.id, n]))

  const width = Math.max(...placed.map((n) => n.x), LEAF_GAP) + LEAF_GAP
  const height = Math.max(...placed.map((n) => n.y), LEVEL_GAP) + LEVEL_GAP * 0.8

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="group"
      aria-label={`Parse tree with ${nodes.length} nodes`}
      style={{ display: 'block', maxWidth: `min(100%, ${Math.round(width * maxScale)}px)`, fontFamily: 'var(--tnt-font)' }}
    >
      <g>
        {placed.map((node) => {
          const parent = node.parent === null ? undefined : byId.get(node.parent)
          if (parent === undefined) return null
          return (
            <line
              key={`link-${node.id}`}
              x1={parent.x}
              y1={parent.y + RADIUS}
              x2={node.x}
              y2={node.y - RADIUS}
              stroke="var(--tnt-edge)"
              strokeWidth={1.4}
            />
          )
        })}
      </g>

      <g>
        {placed.map((node) => {
          const role = highlights.treeNodes.get(node.id)
          return (
            <g
              key={node.id}
              data-node-id={node.id}
              data-op={node.op}
              data-role={role ?? 'idle'}
              role="img"
              aria-label={`${describeOp(node.op)} for ${node.label}${role === undefined ? '' : ', built this step'}`}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={RADIUS}
                fill={fill(role)}
                stroke={stroke(role)}
                strokeWidth={role === undefined ? 1.5 : 2.4}
                style={{ transition: 'fill 140ms ease, stroke 140ms ease' }}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontFamily="var(--tnt-mono)"
                fill={stroke(role)}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.op === 'symbol' ? node.label : glyph(node.op)}
              </text>
              {/* The sub-expression this node stands for, so the tree can be read
                  against the expression the student typed. */}
              <text
                x={node.x}
                y={node.y + RADIUS + 11}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--tnt-mono)"
                fill="var(--tnt-text-muted)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

interface Placed extends ParseTreeNode {
  x: number
  y: number
}

/**
 * Depth sets the row; leaves are spread left to right in tree order and every
 * parent sits centred above its children.
 */
function layout(nodes: readonly ParseTreeNode[]): Placed[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depth = new Map<string, number>()

  const depthOf = (node: ParseTreeNode): number => {
    const known = depth.get(node.id)
    if (known !== undefined) return known
    const parent = node.parent === null ? undefined : byId.get(node.parent)
    const value = parent === undefined ? 0 : depthOf(parent) + 1
    depth.set(node.id, value)
    return value
  }

  const x = new Map<string, number>()
  let nextLeaf = 0

  // Post-order: children are placed before the parent that centres over them.
  const place = (node: ParseTreeNode): number => {
    const children = node.children.map((id) => byId.get(id)).filter((c): c is ParseTreeNode => c !== undefined)

    if (children.length === 0) {
      const at = LEAF_GAP * (nextLeaf + 0.5)
      nextLeaf += 1
      x.set(node.id, at)
      return at
    }

    const positions = children.map(place)
    const at = positions.reduce((sum, p) => sum + p, 0) / positions.length
    x.set(node.id, at)
    return at
  }

  const root = nodes.find((n) => n.parent === null)
  if (root !== undefined) place(root)

  return nodes.map((node) => ({
    ...node,
    x: x.get(node.id) ?? LEAF_GAP,
    y: LEVEL_GAP * (depthOf(node) + 0.6),
  }))
}

/** The operator's symbol, as it is written in the expression. */
function glyph(op: string): string {
  switch (op) {
    case 'union':
      return '+'
    case 'concat':
      return '·'
    case 'star':
      return '*'
    case 'epsilon':
      return 'ε'
    case 'empty':
      return '∅'
    default:
      return ''
  }
}

function describeOp(op: string): string {
  switch (op) {
    case 'union':
      return 'Union'
    case 'concat':
      return 'Concatenation'
    case 'star':
      return 'Star'
    case 'symbol':
      return 'Symbol'
    case 'epsilon':
      return 'Epsilon'
    default:
      return 'Empty language'
  }
}

function fill(role: TreeNodeRole | undefined): string {
  return role === undefined ? 'var(--tnt-state-fill)' : 'var(--tnt-current-soft)'
}

function stroke(role: TreeNodeRole | undefined): string {
  return role === undefined ? 'var(--tnt-state-stroke)' : 'var(--tnt-current)'
}
