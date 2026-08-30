/**
 * The trace-shaped panels the viewer composes: a branch tree for
 * nondeterministic runs (never a single path — the whole point), a parse tree
 * for derivations, tape strips for Turing machines.
 */

import type { BranchNode, Step, Sym } from '@tape-n-trace/engine'
import { BranchTree, ParseTree, TapeStrip, type ParseTreeNode } from '@tape-n-trace/ui'

interface CfgNode {
  id: string
  symbol: string
  children: string[]
  parent: string | null
}

const isBranchNodes = (nodes: unknown[]): nodes is BranchNode[] =>
  nodes.length > 0 && typeof (nodes[0] as BranchNode).state === 'string'

const isCfgNodes = (nodes: unknown[]): nodes is CfgNode[] =>
  nodes.length > 0 && typeof (nodes[0] as CfgNode).symbol === 'string'

export function NodesPanel({
  nodes,
  input,
  step,
}: {
  nodes: unknown[] | undefined
  input: Sym[] | undefined
  step: Step | null
}): React.JSX.Element | null {
  if (nodes === undefined || nodes.length === 0) return null
  if (isBranchNodes(nodes)) {
    return <BranchTree nodes={nodes} input={input ?? []} step={step} />
  }
  if (isCfgNodes(nodes)) {
    const converted: ParseTreeNode[] = nodes.map((n) => ({
      id: n.id,
      op: 'symbol',
      label: n.symbol,
      children: n.children,
      parent: n.parent,
    }))
    return <ParseTree nodes={converted} step={step} />
  }
  return null
}

interface TapeShape {
  cells: string[]
  offset: number
  head: number
}

export function TapesPanel({
  tapes,
  blank,
  mode,
  state,
  step,
}: {
  tapes: TapeShape[] | undefined
  blank: string
  mode: 'head-fixed' | 'tape-fixed'
  state: string | undefined
  step: Step | null
}): React.JSX.Element | null {
  if (tapes === undefined || tapes.length === 0) return null
  return (
    <div className="vyk-stack">
      {tapes.map((tape, i) => (
        <TapeStrip
          key={i}
          tape={tape}
          blank={blank}
          mode={mode}
          step={step}
          tapeIndex={i}
          state={i === 0 ? state : undefined}
          label={tapes.length > 1 ? `Tape ${i + 1}` : 'Tape'}
        />
      ))}
    </div>
  )
}
