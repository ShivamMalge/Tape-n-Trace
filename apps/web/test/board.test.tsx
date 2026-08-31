/**
 * The classroom board — phases-ui.md U4, phases.md §5.
 *
 * Two layers. The recogniser is pure and is tested with synthetic strokes:
 * a loop is a state, a stroke between states an arc, a loop inside a state
 * the accepting ring, a scribble a rub-out. The component is tested the way
 * a lecturer uses it: pointer strokes on the board, chips for the labels,
 * Simulate for the panel, and the engine's verdict at the end — with the
 * machine that reaches the engine being the one the board drew.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board, pretty } from '../components/board/board'
import { recognise, STATE_RADIUS, type PlacedState } from '../lib/board-recognize'

afterEach(cleanup)

const loop = (cx: number, cy: number, r: number, n = 40): { x: number; y: number }[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })

const line = (from: { x: number; y: number }, to: { x: number; y: number }, n = 20): { x: number; y: number }[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n }))

describe('the recogniser', () => {
  const q0: PlacedState = { id: 'q0', at: { x: 150, y: 330 } }
  const q1: PlacedState = { id: 'q1', at: { x: 400, y: 300 } }

  it('reads a closed loop on empty board as a new state at its centre', () => {
    const found = recognise(loop(500, 200, 50), [])
    expect(found.kind).toBe('state')
    if (found.kind === 'state') {
      expect(Math.abs(found.at.x - 500)).toBeLessThan(3)
      expect(Math.abs(found.at.y - 200)).toBeLessThan(3)
    }
  })

  it('reads a stroke from one state to another as an arc, and back to itself as a loop', () => {
    expect(recognise(line(q0.at, q1.at), [q0, q1])).toMatchObject({ kind: 'arc', from: 'q0', to: 'q1' })
    const out = { x: q0.at.x, y: q0.at.y - STATE_RADIUS * 2 }
    const selfLoop = [...line(q0.at, out), ...line(out, { x: q0.at.x + 20, y: q0.at.y })]
    expect(recognise(selfLoop, [q0])).toMatchObject({ kind: 'arc', from: 'q0', to: 'q0' })
  })

  it('reads a loop inside a state as its accepting ring, not a new state', () => {
    expect(recognise(loop(q1.at.x, q1.at.y, 30), [q0, q1])).toEqual({ kind: 'accepting', state: 'q1' })
  })

  it('reads a stroke into a state from its left as the start marker', () => {
    expect(recognise(line({ x: 20, y: 300 }, { x: 350, y: 300 }), [q0, q1])).toEqual({ kind: 'start', state: 'q1' })
  })

  it('reads a scribble over a state as a rub-out', () => {
    const scribble: { x: number; y: number }[] = []
    for (let i = 0; i < 8; i++) {
      scribble.push(...line({ x: q1.at.x - 50, y: q1.at.y - 20 + i * 5 }, { x: q1.at.x + 50, y: q1.at.y - 20 + i * 5 }, 4))
    }
    expect(recognise(scribble, [q0, q1])).toEqual({ kind: 'scrub', state: 'q1' })
  })

  it('says why when it recognises nothing, rather than guessing', () => {
    const found = recognise(line({ x: 600, y: 100 }, { x: 700, y: 120 }), [q0, q1])
    expect(found.kind).toBe('nothing')
  })

  it('letters q3 as q₃', () => {
    expect(pretty('q3')).toBe('q₃')
    expect(pretty('q12')).toBe('q₁₂')
  })
})

/** Draw a stroke on the board with pointer events, jsdom-style (the rect is at 0,0). */
function stroke(svg: Element, points: { x: number; y: number }[]): void {
  const [first, ...rest] = points as [{ x: number; y: number }, ...{ x: number; y: number }[]]
  fireEvent.pointerDown(svg, { clientX: first.x, clientY: first.y, button: 0, pointerId: 1, pointerType: 'pen' })
  for (const p of rest) fireEvent.pointerMove(svg, { clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'pen' })
  const last = points[points.length - 1] as { x: number; y: number }
  fireEvent.pointerUp(svg, { clientX: last.x, clientY: last.y, pointerId: 1, pointerType: 'pen' })
}

describe('the board', () => {
  it('turns two loops and a stroke into a labelled machine, then runs it with the engine', async () => {
    const user = userEvent.setup()
    render(<Board />)
    const svg = screen.getByRole('application')

    stroke(svg, loop(150, 330, 50))
    expect(screen.getByRole('img', { name: /State q0, start state/ })).toBeDefined()
    expect(screen.getByRole('status').textContent).toContain('named q₀')

    stroke(svg, loop(450, 300, 50))
    expect(screen.getByRole('img', { name: /State q1/ })).toBeDefined()

    // An arc q0 → q1, labelled from the chips — no handwriting is read.
    stroke(svg, line({ x: 150, y: 330 }, { x: 450, y: 300 }))
    const picker = screen.getByRole('group', { name: /Label the arc from q0 to q1/ })
    await user.click(within(picker).getByRole('button', { name: '0' }))
    expect(within(picker).getByRole('button', { name: '0' }).getAttribute('aria-pressed')).toBe('true')

    // A loop inside q1 makes it accepting.
    stroke(svg, loop(450, 300, 30))
    expect(screen.getByRole('img', { name: /State q1, accepting state/ })).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Simulate' }))
    const panel = screen.getByRole('complementary', { name: /Transition table/ })
    const table = within(panel).getByRole('table')
    expect(within(table).getByText('→ q₀')).toBeDefined()
    expect(within(table).getAllByText('q₁').length).toBeGreaterThan(0)

    await user.click(within(panel).getByRole('button', { name: '0011' }))
    expect(screen.getAllByRole('slider', { name: 'Step' })).toHaveLength(1)
    // 0011 is not in L(q0 -0-> q1): the engine says so, the board only relays it.
    const slider = screen.getByRole('slider', { name: 'Step' }) as HTMLInputElement
    fireEvent.change(slider, { target: { value: slider.max } })
    expect(within(panel).getByText('Rejected')).toBeDefined()
  })

  it('undoes the last stroke and counts what is on the board', async () => {
    const user = userEvent.setup()
    render(<Board />)
    const svg = screen.getByRole('application')

    stroke(svg, loop(150, 330, 50))
    stroke(svg, loop(450, 300, 50))
    expect(screen.getByText('2 states · 0 arcs')).toBeDefined()

    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(screen.getByText('1 state · 0 arcs')).toBeDefined()
    expect(screen.queryByRole('img', { name: /State q1/ })).toBeNull()
  })

  it('refuses to run an unfinished machine and says what is missing', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await user.click(screen.getByRole('button', { name: 'Simulate' }))
    const panel = screen.getByRole('complementary', { name: /Transition table/ })
    expect(panel.textContent).toContain('Draw a loop to make a state')
    expect((within(panel).getByRole('button', { name: '0011' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
