/**
 * `@tape-n-trace/ui` — pure renderers.
 *
 * React components that take a machine and a step and draw them. No fetching,
 * no effects, no engine calls: the engine's types are imported for typing only
 * and erase at build time, which is what lets the notebook bridge mount these
 * against a trace that arrived over a traitlet.
 */

export {
  EPSILON_GLYPH,
  NODE_RADIUS,
  MINI_NODE_RADIUS,
  ACCEPTING_INSET,
  groupTransitions,
  readLabel,
  edgeGeometry,
  selfLoopGeometry,
  startMarkerGeometry,
} from './automaton/geometry.js'
export type { EdgeGroup, EdgeGeometry } from './automaton/geometry.js'

export { boundsOf, layeredLayout, resolveLayout } from './automaton/layout.js'
export type { Layout, LayoutOptions, ViewBox } from './automaton/layout.js'

export {
  edgeRole,
  indexHighlights,
  stateColor,
  stateFill,
  transitionColor,
} from './automaton/highlights.js'
export type {
  HighlightIndex,
  InputRole,
  StateRole,
  SymbolSetRole,
  TransitionRole,
  TreeNodeRole,
} from './automaton/highlights.js'

export { eventPoint, stateAt, svgPoint, transitionsAt } from './automaton/coords.js'

export { AutomatonRenderer } from './automaton/automaton-renderer.js'
export type { AutomatonRendererProps } from './automaton/automaton-renderer.js'

export { StateNode } from './automaton/state-node.js'
export type { StateNodeProps } from './automaton/state-node.js'

export { TransitionEdge } from './automaton/transition-edge.js'
export type { TransitionEdgeProps } from './automaton/transition-edge.js'

export { SelfLoop } from './automaton/self-loop.js'
export type { SelfLoopProps } from './automaton/self-loop.js'

export { InputStrip } from './automaton/input-strip.js'
export type { InputStripProps } from './automaton/input-strip.js'

export { BranchTree } from './tree/branch-tree.js'
export type { BranchTreeProps } from './tree/branch-tree.js'

export { SPEED_CHOICES, TransportBar } from './controls/transport-bar.js'
export type { TransportBarProps } from './controls/transport-bar.js'
