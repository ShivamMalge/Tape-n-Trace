/**
 * Ink recognition for the classroom board — phases.md §5, "the renderer as the
 * beautifier".
 *
 * A stroke is a list of points. This module says what the stroke *was*: a
 * loop (a new state, or a second ring on an existing one), an arc from one
 * state to another (or back to itself), a start marker drawn into a state, a
 * tap, a scribble over a state, or nothing it recognises. It never decides
 * what the machine *means* — the caller applies the engine's editing
 * operations, and the engine's `simulate` runs the result. There is no
 * handwriting recognition anywhere: labels come from the chip picker.
 *
 * Pure and dependency-free, so it is unit-tested with synthetic strokes.
 */

import type { Point, StateId } from '@tape-n-trace/engine'

/** Every state is redrawn at this radius, whatever size the loop was drawn. */
export const STATE_RADIUS = 56

export interface PlacedState {
  id: StateId
  at: Point
}

export type Recognised =
  | { kind: 'state'; at: Point }
  | { kind: 'accepting'; state: StateId }
  | { kind: 'arc'; from: StateId; to: StateId; at: Point }
  | { kind: 'start'; state: StateId }
  | { kind: 'tap'; state: StateId | null; at: Point }
  | { kind: 'scrub'; state: StateId }
  | { kind: 'nothing'; why: string }

export interface Features {
  length: number
  closedness: number
  turning: number
  reversals: number
  bbox: { x: number; y: number; width: number; height: number }
  centroid: Point
  meanRadius: number
}

const TAP_LENGTH = 10

/** Geometry of a stroke, for the classifier and for tests that want to see why. */
export function featuresOf(points: readonly Point[]): Features {
  const pts = simplify(points)
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  const centroid = {
    x: xs.reduce((a, b) => a + b, 0) / pts.length,
    y: ys.reduce((a, b) => a + b, 0) / pts.length,
  }

  let length = 0
  let turning = 0
  let reversals = 0
  let previousAngle: number | null = null
  let previousDx = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as Point
    const b = pts[i] as Point
    const dx = b.x - a.x
    const dy = b.y - a.y
    length += Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    if (previousAngle !== null) {
      let delta = angle - previousAngle
      while (delta > Math.PI) delta -= 2 * Math.PI
      while (delta < -Math.PI) delta += 2 * Math.PI
      turning += delta
    }
    previousAngle = angle
    if (previousDx !== 0 && Math.sign(dx) !== 0 && Math.sign(dx) !== Math.sign(previousDx)) reversals += 1
    if (dx !== 0) previousDx = dx
  }

  const first = pts[0] as Point
  const last = pts[pts.length - 1] as Point
  const diagonal = Math.hypot(bbox.width, bbox.height)
  const closedness = diagonal === 0 ? 0 : Math.hypot(last.x - first.x, last.y - first.y) / diagonal
  const meanRadius = pts.reduce((sum, p) => sum + Math.hypot(p.x - centroid.x, p.y - centroid.y), 0) / pts.length

  return { length, closedness, turning, reversals, bbox, centroid, meanRadius }
}

/** Drop points closer than 3px to their predecessor — pen jitter, not shape. */
function simplify(points: readonly Point[]): Point[] {
  if (points.length === 0) return [{ x: 0, y: 0 }]
  const out: Point[] = [points[0] as Point]
  for (const p of points.slice(1)) {
    const q = out[out.length - 1] as Point
    if (Math.hypot(p.x - q.x, p.y - q.y) >= 3) out.push(p)
  }
  return out
}

/** The state whose disc (with a margin) contains the point, nearest first. */
export function stateNear(states: readonly PlacedState[], p: Point, margin = 1.25): PlacedState | null {
  let best: PlacedState | null = null
  let bestDistance = Infinity
  for (const s of states) {
    const d = Math.hypot(s.at.x - p.x, s.at.y - p.y)
    if (d <= STATE_RADIUS * margin && d < bestDistance) {
      best = s
      bestDistance = d
    }
  }
  return best
}

export function recognise(points: readonly Point[], states: readonly PlacedState[]): Recognised {
  if (points.length === 0) return { kind: 'nothing', why: 'an empty stroke' }
  const f = featuresOf(points)
  const first = points[0] as Point
  const last = points[points.length - 1] as Point

  // A tap: on a state it is a mark, off a state it is nothing.
  if (f.length < TAP_LENGTH) {
    const hit = stateNear(states, first, 1.0)
    return { kind: 'tap', state: hit?.id ?? null, at: first }
  }

  // A scribble back and forth over a state rubs it out.
  if (f.reversals >= 5 && f.length > STATE_RADIUS * 2) {
    const hit = stateNear(states, f.centroid, 1.0)
    if (hit !== null) return { kind: 'scrub', state: hit.id }
  }

  const aspect = f.bbox.height === 0 ? Infinity : f.bbox.width / f.bbox.height
  const roundish = aspect > 0.45 && aspect < 2.2
  const loops = Math.abs(f.turning) >= Math.PI * 1.5 && f.closedness < 0.4 && roundish && f.length > 40

  if (loops) {
    const within = stateNear(states, f.centroid, 0.6)
    // A loop drawn inside an existing state is its second ring: accepting.
    if (within !== null && f.meanRadius < STATE_RADIUS * 1.4) return { kind: 'accepting', state: within.id }
    const crowding = stateNear(states, f.centroid, 2.0)
    if (crowding !== null) {
      return { kind: 'nothing', why: `too close to ${crowding.id} for a new state — draw it further away, or draw inside ${crowding.id} to mark it accepting` }
    }
    return { kind: 'state', at: f.centroid }
  }

  const from = stateNear(states, first)
  const to = stateNear(states, last)

  if (from !== null && to !== null) {
    if (from.id === to.id && f.length < STATE_RADIUS * 1.5) {
      return { kind: 'nothing', why: `a stroke inside ${from.id} — draw a loop that leaves and returns for a self-loop` }
    }
    const mid = points[Math.floor(points.length / 2)] as Point
    return { kind: 'arc', from: from.id, to: to.id, at: mid }
  }

  // Into a state from empty board on its left: the start marker.
  if (from === null && to !== null && first.x < to.at.x - STATE_RADIUS && Math.abs(first.y - to.at.y) < STATE_RADIUS * 1.5) {
    return { kind: 'start', state: to.id }
  }

  if (from !== null && to === null) {
    return { kind: 'nothing', why: `an arc from ${from.id} that ends on empty board — end it on a state, or draw a loop there first` }
  }

  return { kind: 'nothing', why: 'not a loop and not an arc between states — draw a closed loop for a state, or a stroke from one state to another' }
}
