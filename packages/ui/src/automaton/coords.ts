/**
 * Screen coordinates to diagram coordinates, and back out of an event.
 *
 * The renderer draws in its own viewBox space, which is scaled and offset from
 * the page by whatever size the SVG happens to be. An editor that stored raw
 * client coordinates would place states correctly at one window size and wrongly
 * at every other, so every position that goes into `machine.layout` passes
 * through here first.
 *
 * The hit-testing helpers read the `data-` attributes the components already
 * emit. Event delegation rather than a callback per element: the renderer stays
 * a pure function of props, and all editing policy stays in the editor.
 */

import type { Point, StateId, TransitionId } from '@tape-n-trace/engine'

/** Convert a client (page) coordinate into the SVG's own coordinate space. */
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const matrix = svg.getScreenCTM()
  if (matrix === null) return { x: clientX, y: clientY }

  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const local = point.matrixTransform(matrix.inverse())
  return { x: round(local.x), y: round(local.y) }
}

/** Where in the diagram a pointer event landed. */
export function eventPoint(
  svg: SVGSVGElement | null,
  event: { clientX: number; clientY: number },
): Point | null {
  return svg === null ? null : svgPoint(svg, event.clientX, event.clientY)
}

/** The state a pointer event landed on, or `null` for empty canvas. */
export function stateAt(target: EventTarget | null): StateId | null {
  return closestAttribute(target, 'data-state-id')
}

/** The transitions the drawn edge under the pointer stands for. */
export function transitionsAt(target: EventTarget | null): TransitionId[] | null {
  const value = closestAttribute(target, 'data-transition-ids')
  return value === null ? null : value.split(' ')
}

function closestAttribute(target: EventTarget | null, attribute: string): string | null {
  if (target === null || !(target instanceof Element)) return null
  return target.closest(`[${attribute}]`)?.getAttribute(attribute) ?? null
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
