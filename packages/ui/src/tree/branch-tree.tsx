/**
 * The nondeterministic branch tree.
 *
 * Nondeterminism renders as a **tree, not a path**: every live branch at once,
 * dead branches greyed at the step they died, the accepting path highlighted at
 * the end. This is the single thing a blackboard cannot show, and the reason
 * `simulateNFA` keeps dead nodes in its snapshot instead of dropping them.
 *
 * A branch is placed by the number of symbols it has consumed, so depth reads
 * left-to-right in step with the input strip above it.
 */

import type { BranchNode, Step, Sym } from '@tape-n-trace/engine'
import { indexHighlights } from '../automaton/highlights.js'

export interface BranchTreeProps {
  nodes: readonly BranchNode[]
  input: readonly Sym[]
  step?: Step | null | undefined
  mini?: boolean
  /** Past this many nodes the tree is unreadable anyway; the rest are summarised. */
  maxNodes?: number
  className?: string
  /** The most the tree may be scaled up from its own coordinates (a notebook cell asks for less). */
  maxScale?: number | undefined
}

const COLUMN_GAP = 96
const ROW_GAP = 34
const RADIUS = 13

export function BranchTree({
  nodes,
  input,
  step = null,
  mini = false,
  maxNodes = 400,
  className,
  maxScale = 1.5,
}: BranchTreeProps): React.JSX.Element {
  const highlights = indexHighlights(step?.highlight)
  const shown = nodes.slice(0, maxNodes)
  const hidden = nodes.length - shown.length

  const placed = placeNodes(shown)
  const byId = new Map(placed.map((n) => [n.id, n]))
  const width = (maxPosition(shown) + 1) * COLUMN_GAP + RADIUS * 3
  const height = Math.max(1, maxRow(placed) + 1) * ROW_GAP + RADIUS * 3

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="group"
        aria-label={describeTree(nodes, input)}
        style={{ display: 'block', maxWidth: `min(100%, ${Math.round(width * maxScale)}px)`, fontFamily: 'var(--tnt-font)' }}
      >
        <g className="tnt-branch-links">
          {placed.map((node) => {
            const parent = node.parent === null ? undefined : byId.get(node.parent)
            if (parent === undefined) return null
            return (
              <line
                key={`link-${node.id}`}
                x1={parent.x}
                y1={parent.y}
                x2={node.x}
                y2={node.y}
                stroke={linkColor(node.status)}
                strokeWidth={node.status === 'dead' ? 1 : 1.8}
                strokeDasharray={node.status === 'dead' ? '3 3' : undefined}
              />
            )
          })}
        </g>

        <g className="tnt-branch-nodes">
          {placed.map((node) => {
            const role = highlights.treeNodes.get(node.id)
            const emphasised = role !== undefined && role !== 'dead'
            return (
              <g
                key={node.id}
                className="tnt-branch-node tnt-animated"
                data-node-id={node.id}
                data-status={node.status}
                role="img"
                aria-label={describeNode(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={RADIUS}
                  fill={nodeFill(node.status)}
                  stroke={nodeStroke(node.status)}
                  strokeWidth={emphasised ? 2.4 : 1.5}
                />
                {mini ? null : (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={node.state.length > 3 ? 8 : 10}
                    fontFamily="var(--tnt-mono)"
                    fill={nodeStroke(node.status)}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.state}
                  </text>
                )}
                {/* The step a branch died at is the reading of the tree, so it is
                    drawn rather than left to a tooltip. */}
                {node.status === 'dead' && node.diedAtStep !== undefined && !mini ? (
                  <text
                    x={node.x}
                    y={node.y + RADIUS + 9}
                    textAnchor="middle"
                    fontSize={8}
                    fill="var(--tnt-dead)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {`died @${node.diedAtStep}`}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>

      {hidden > 0 ? (
        <figcaption style={{ fontSize: 12, color: 'var(--tnt-text-muted)', marginTop: 6 }}>
          Showing the first {shown.length} branches of {nodes.length}. The remaining {hidden} are in the
          trace but not drawn.
        </figcaption>
      ) : null}
    </figure>
  )
}

interface PlacedNode extends BranchNode {
  x: number
  y: number
  row: number
}

/**
 * Column by symbols consumed, row by order of creation within that column.
 * Creation order is deterministic in the engine, so the tree is stable across
 * runs and a snapshot test means something.
 */
function placeNodes(nodes: readonly BranchNode[]): PlacedNode[] {
  const rowsUsed = new Map<number, number>()

  return nodes.map((node) => {
    const row = rowsUsed.get(node.position) ?? 0
    rowsUsed.set(node.position, row + 1)
    return {
      ...node,
      row,
      x: RADIUS * 1.5 + node.position * COLUMN_GAP,
      y: RADIUS * 1.5 + row * ROW_GAP,
    }
  })
}

function maxPosition(nodes: readonly BranchNode[]): number {
  return nodes.reduce((max, n) => Math.max(max, n.position), 0)
}

function maxRow(nodes: readonly PlacedNode[]): number {
  return nodes.reduce((max, n) => Math.max(max, n.row), 0)
}

function nodeFill(status: BranchNode['status']): string {
  switch (status) {
    case 'accepting':
      return 'var(--tnt-accepting-soft)'
    case 'dead':
      return 'var(--tnt-dead-soft)'
    default:
      return 'var(--tnt-current-soft)'
  }
}

function nodeStroke(status: BranchNode['status']): string {
  switch (status) {
    case 'accepting':
      return 'var(--tnt-accepting)'
    case 'dead':
      return 'var(--tnt-dead)'
    default:
      return 'var(--tnt-current)'
  }
}

function linkColor(status: BranchNode['status']): string {
  return status === 'dead' ? 'var(--tnt-dead)' : 'var(--tnt-edge)'
}

function describeNode(node: BranchNode): string {
  const where = `Branch in state ${node.state} after ${node.position} symbols`
  switch (node.status) {
    case 'accepting':
      return `${where}, accepting.`
    case 'dead':
      return `${where}, died at step ${node.diedAtStep ?? 0}.`
    default:
      return `${where}, still live.`
  }
}

function describeTree(nodes: readonly BranchNode[], input: readonly Sym[]): string {
  const live = nodes.filter((n) => n.status === 'live').length
  const dead = nodes.filter((n) => n.status === 'dead').length
  const accepting = nodes.filter((n) => n.status === 'accepting').length
  const word = input.length === 0 ? 'the empty string' : input.join('')
  return `Branch tree for ${word}: ${nodes.length} branches, ${live} live, ${dead} dead, ${accepting} accepting.`
}
