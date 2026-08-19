/**
 * Edge geometry — architecture.md §7.
 *
 * "An ugly diagram makes a correct engine feel amateur", so the three edge rules
 * §7 lays down are tested rather than eyeballed.
 */

import { describe, expect, it } from 'vitest'
import { dfaContains01, nfaEndsIn01, faTransitionId } from '@tape-n-trace/engine'
import type { FiniteAutomaton } from '@tape-n-trace/engine'
import {
  EPSILON_GLYPH,
  edgeGeometry,
  groupTransitions,
  selfLoopGeometry,
  startMarkerGeometry,
} from '../src/index.js'

describe('groupTransitions', () => {
  it('merges parallel edges into one, with a comma-joined label (§7)', () => {
    const groups = groupTransitions(dfaContains01)
    const q2Loop = groups.find((g) => g.from === 'q2' && g.to === 'q2')

    // q2 loops on both 0 and 1: one drawn edge, not two overlapping lines.
    expect(q2Loop?.label).toBe('0, 1')
    expect(q2Loop?.ids).toHaveLength(2)
    expect(q2Loop?.isSelfLoop).toBe(true)
  })

  it('renders an ε-transition with the glyph, which lives only in the UI (ADR-002)', () => {
    const enfa: FiniteAutomaton = {
      kind: 'ENFA',
      states: ['A', 'B'],
      alphabet: ['0'],
      transitions: [{ id: faTransitionId('A', null, 'B'), from: 'A', read: null, to: 'B' }],
      start: 'A',
      accepting: ['B'],
    }
    expect(groupTransitions(enfa)[0]?.label).toBe(EPSILON_GLYPH)
  })

  it('does not repeat a symbol that appears twice between the same pair', () => {
    const machine: FiniteAutomaton = {
      ...nfaEndsIn01,
      transitions: [
        { id: 't1', from: 'q0', read: '0', to: 'q1' },
        { id: 't2', from: 'q0', read: '0', to: 'q1' },
      ],
    }
    expect(groupTransitions(machine)[0]?.label).toBe('0')
  })

  it('bows a pair that runs in both directions, and leaves a lone edge straight (§7)', () => {
    const machine: FiniteAutomaton = {
      kind: 'NFA',
      states: ['p', 'q', 'r'],
      alphabet: ['0'],
      transitions: [
        { id: 'a', from: 'p', read: '0', to: 'q' },
        { id: 'b', from: 'q', read: '0', to: 'p' },
        { id: 'c', from: 'q', read: '0', to: 'r' },
      ],
      start: 'p',
      accepting: ['r'],
    }
    const groups = groupTransitions(machine)
    expect(groups.find((g) => g.from === 'p' && g.to === 'q')?.bowed).toBe(true)
    expect(groups.find((g) => g.from === 'q' && g.to === 'p')?.bowed).toBe(true)
    expect(groups.find((g) => g.from === 'q' && g.to === 'r')?.bowed).toBe(false)
  })

  it('is deterministic, so a renderer snapshot means something', () => {
    expect(groupTransitions(dfaContains01)).toEqual(groupTransitions(dfaContains01))
  })
})

describe('edgeGeometry', () => {
  const from = { x: 0, y: 0 }
  const to = { x: 100, y: 0 }

  it('starts and ends on the rims, not the centres, so the arrowhead stays visible', () => {
    const g = edgeGeometry(from, to, 20, false)
    expect(g.path).toBe('M 20 0 L 80 0')
  })

  it('draws a quadratic curve when bowed', () => {
    expect(edgeGeometry(from, to, 20, true).path).toContain('Q')
  })

  it('bows A→B and B→A to opposite sides, so neither hides the other', () => {
    const forward = edgeGeometry(from, to, 20, true)
    const back = edgeGeometry(to, from, 20, true)
    // Label offsets land on opposite sides of the straight line y = 0.
    expect(Math.sign(forward.label.y)).toBe(-Math.sign(back.label.y))
  })

  it('survives two states sitting on top of each other', () => {
    expect(() => edgeGeometry(from, { x: 0, y: 0 }, 20, false)).not.toThrow()
  })

  it('reports the angle of travel for the arrowhead', () => {
    expect(edgeGeometry(from, to, 20, false).angle).toBe(0)
    expect(edgeGeometry(from, { x: 0, y: 100 }, 20, false).angle).toBe(90)
  })
})

describe('selfLoopGeometry', () => {
  it('rises above the node (§7)', () => {
    const center = { x: 50, y: 50 }
    const g = selfLoopGeometry(center, 20)
    expect(g.label.y).toBeLessThan(center.y - 20)
  })

  it('leaves and re-enters the same node symmetrically', () => {
    const g = selfLoopGeometry({ x: 50, y: 50 }, 20)
    const [, startX, , , , , , , endX] = g.path.split(/[\s]+/)
    expect(50 - Number(startX)).toBeCloseTo(Number(endX) - 50, 5)
  })
})

describe('startMarkerGeometry', () => {
  it('points into the node from the left', () => {
    const g = startMarkerGeometry({ x: 100, y: 40 }, 24)
    expect(g.path).toBe('M 50 40 L 74 40')
    expect(g.angle).toBe(0)
  })
})
