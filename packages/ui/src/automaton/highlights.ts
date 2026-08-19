/**
 * Turning a step's highlights into something a component can look up.
 *
 * The engine emits highlights as a flat list, semantically — it names *what*
 * matters, never a colour (§5). This module is the one place that flat list
 * becomes per-element lookups, so no component ends up scanning the array
 * itself and quietly disagreeing with another about precedence.
 */

import type { Highlight, StateId, TransitionId } from '@tape-n-trace/engine'

export type StateRole = Extract<Highlight, { type: 'state' }>['role']
export type TransitionRole = Extract<Highlight, { type: 'transition' }>['role']
export type InputRole = NonNullable<Extract<Highlight, { type: 'input' }>['role']>
export type TreeNodeRole = Extract<Highlight, { type: 'treeNode' }>['role']
export type SymbolSetRole = Extract<Highlight, { type: 'symbolSet' }>['role']

/**
 * When one element carries two roles in a step, the more specific wins.
 *
 * This happens on purpose: the opening step of a run marks the start state as
 * both `start` and `current`, and `current` is what the reader needs to see —
 * the start marker is drawn from the machine itself anyway, so it loses nothing.
 */
const STATE_PRECEDENCE: StateRole[] = ['current', 'accepting', 'new', 'marked', 'dead', 'start']
const TRANSITION_PRECEDENCE: TransitionRole[] = ['taken', 'added', 'removed', 'candidate']

export interface HighlightIndex {
  states: Map<StateId, StateRole>
  transitions: Map<TransitionId, TransitionRole>
  inputs: Map<number, InputRole>
  treeNodes: Map<string, TreeNodeRole>
  symbolSets: { ids: string[]; role: SymbolSetRole }[]
}

const EMPTY: HighlightIndex = {
  states: new Map(),
  transitions: new Map(),
  inputs: new Map(),
  treeNodes: new Map(),
  symbolSets: [],
}

export function indexHighlights(highlights: readonly Highlight[] | undefined): HighlightIndex {
  if (highlights === undefined || highlights.length === 0) return EMPTY

  const index: HighlightIndex = {
    states: new Map(),
    transitions: new Map(),
    inputs: new Map(),
    treeNodes: new Map(),
    symbolSets: [],
  }

  for (const h of highlights) {
    switch (h.type) {
      case 'state':
        keepStronger(index.states, h.id, h.role, STATE_PRECEDENCE)
        break
      case 'transition':
        keepStronger(index.transitions, h.id, h.role, TRANSITION_PRECEDENCE)
        break
      case 'input':
        index.inputs.set(h.position, h.role ?? 'read')
        break
      case 'treeNode':
        index.treeNodes.set(h.id, h.role)
        break
      case 'symbolSet':
        index.symbolSets.push({ ids: [...h.ids], role: h.role })
        break
      default:
        // Stack, tape, table and production highlights belong to machines this
        // renderer does not draw. Ignored rather than mishandled.
        break
    }
  }

  return index
}

function keepStronger<K, R>(map: Map<K, R>, key: K, role: R, precedence: R[]): void {
  const existing = map.get(key)
  if (existing === undefined) {
    map.set(key, role)
    return
  }
  const rank = (r: R): number => {
    const i = precedence.indexOf(r)
    return i === -1 ? precedence.length : i
  }
  if (rank(role) < rank(existing)) map.set(key, role)
}

/**
 * A CSS custom property name per role, so colour lives entirely in tokens.css
 * and a component never hard-codes one.
 */
export function stateColor(role: StateRole | undefined): string {
  switch (role) {
    case 'current':
      return 'var(--tnt-current)'
    case 'accepting':
      return 'var(--tnt-accepting)'
    case 'dead':
      return 'var(--tnt-dead)'
    case 'new':
      return 'var(--tnt-new)'
    case 'marked':
      return 'var(--tnt-marked)'
    default:
      return 'var(--tnt-state-stroke)'
  }
}

export function stateFill(role: StateRole | undefined): string {
  switch (role) {
    case 'current':
      return 'var(--tnt-current-soft)'
    case 'accepting':
      return 'var(--tnt-accepting-soft)'
    case 'dead':
      return 'var(--tnt-dead-soft)'
    default:
      return 'var(--tnt-state-fill)'
  }
}

export function transitionColor(role: TransitionRole | undefined): string {
  switch (role) {
    case 'taken':
      return 'var(--tnt-taken)'
    case 'added':
      return 'var(--tnt-new)'
    case 'removed':
      return 'var(--tnt-dead)'
    case 'candidate':
      return 'var(--tnt-candidate)'
    default:
      return 'var(--tnt-edge)'
  }
}

/** The strongest role carried by any transition an edge stands for. */
export function edgeRole(
  ids: readonly TransitionId[],
  index: HighlightIndex,
): TransitionRole | undefined {
  let best: TransitionRole | undefined
  let bestRank = TRANSITION_PRECEDENCE.length

  for (const id of ids) {
    const role = index.transitions.get(id)
    if (role === undefined) continue
    const rank = TRANSITION_PRECEDENCE.indexOf(role)
    const effective = rank === -1 ? TRANSITION_PRECEDENCE.length : rank
    if (effective < bestRank) {
      best = role
      bestRank = effective
    }
  }

  return best
}
