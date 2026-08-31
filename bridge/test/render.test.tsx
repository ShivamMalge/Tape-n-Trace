/**
 * The V1 acceptance criteria, headless: a hand-written simulate.dfa trace
 * renders with working transport, `step` set from the model moves the view,
 * and the view pushes step changes back through the model.
 */

import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { fireEvent } from '@testing-library/react'
import type { Trace } from '@tape-n-trace/engine'
import widget from '../src/index.js'
import type { AnyModel } from '../src/model.js'

;(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true

const MACHINE = {
  kind: 'DFA',
  states: ['a', 'b'],
  alphabet: ['0', '1'],
  transitions: [
    { id: 't1', from: 'a', read: '0', to: 'b' },
    { id: 't2', from: 'b', read: '1', to: 'b' },
  ],
  start: 'a',
  accepting: ['b'],
}

/** Hand-written, as V1's criterion asks — not produced by the engine. */
const TRACE: Trace = {
  kind: 'simulate.dfa',
  engineVersion: '0.1.0',
  input: { word: '01' },
  steps: [
    {
      index: 0,
      narration: 'Start in state a with the whole input unread.',
      highlight: [{ type: 'state', id: 'a', role: 'start' }],
      snapshot: { machine: MACHINE, input: ['0', '1'], position: 0, state: 'a', status: 'running' },
    },
    {
      index: 1,
      narration: 'Read 0 and move to state b.',
      highlight: [{ type: 'state', id: 'b', role: 'current' }, { type: 'transition', id: 't1', role: 'taken' }],
      snapshot: { machine: MACHINE, input: ['0', '1'], position: 1, state: 'b', status: 'running' },
    },
    {
      index: 2,
      narration: 'Read 1, stay in b, and accept: b is an accepting state.',
      highlight: [{ type: 'state', id: 'b', role: 'accepting' }],
      snapshot: { machine: MACHINE, input: ['0', '1'], position: 2, state: 'b', status: 'accepted' },
    },
  ],
  result: { type: 'acceptance', accepted: true },
  meta: { stepCount: 3, counters: {} },
} as unknown as Trace

function makeModel(initial: Record<string, unknown>): AnyModel & { saved: ReturnType<typeof vi.fn> } {
  const store = new Map(Object.entries(initial))
  const subscribers = new Map<string, (() => void)[]>()
  const saved = vi.fn()
  return {
    saved,
    get: (key) => store.get(key),
    set(key, value) {
      store.set(key, value)
      for (const callback of subscribers.get(`change:${key}`) ?? []) callback()
    },
    save_changes: saved,
    on(event, callback) {
      subscribers.set(event, [...(subscribers.get(event) ?? []), callback])
    },
  }
}

function mount(model: AnyModel): { el: HTMLElement; cleanup: () => void } {
  const el = document.createElement('div')
  document.body.appendChild(el)
  let cleanup: () => void = () => {}
  act(() => {
    cleanup = widget.render({ model, el })
  })
  return { el, cleanup }
}

describe('the bridge widget', () => {
  it('renders a hand-written simulate.dfa trace with a working transport', () => {
    const model = makeModel({ payload: null, trace: TRACE, step: 0, options: {} })
    const { el, cleanup } = mount(model)

    expect(el.querySelector('.vyakarana-container')).not.toBeNull()
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.textContent).toContain('Start in state a with the whole input unread.')

    const slider = el.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider).not.toBeNull()
    expect(slider.max).toBe('2')

    cleanup()
    expect(el.querySelector('.vyakarana-container')).toBeNull()
  })

  it('follows a step set from the model — run.step = 2 in Python moves the widget', () => {
    const model = makeModel({ payload: null, trace: TRACE, step: 0, options: {} })
    const { el } = mount(model)

    act(() => {
      model.set('step', 2)
    })
    expect(el.textContent).toContain('Read 1, stay in b, and accept')
    expect(el.textContent).toContain('Accepted.')
  })

  it('pushes transport changes back through the model, so Python reads what the widget shows', () => {
    const model = makeModel({ payload: null, trace: TRACE, step: 0, options: {} })
    const { el } = mount(model)

    const slider = el.querySelector('input[type="range"]') as HTMLInputElement
    act(() => {
      fireEvent.change(slider, { target: { value: '1' } })
    })
    expect(model.get('step')).toBe(1)
    expect(model.saved).toHaveBeenCalled()
    expect(el.textContent).toContain('Read 0 and move to state b.')
  })

  it('renders a nondeterministic run as a branch tree, not a single path', () => {
    const nodes = [
      { id: 'n0', state: 'q0', position: 0, parent: null, via: null, status: 'live' },
      { id: 'n1', state: 'q0', position: 1, parent: 'n0', via: 't1', status: 'dead', diedAtStep: 1 },
      { id: 'n2', state: 'q1', position: 1, parent: 'n0', via: 't2', status: 'accepting' },
    ]
    const trace = {
      ...TRACE,
      kind: 'simulate.tm',
      steps: [{ ...TRACE.steps[0], snapshot: { ...(TRACE.steps[0] as { snapshot: object }).snapshot, nodes } }],
      meta: { stepCount: 1, counters: {} },
    } as unknown as Trace
    const model = makeModel({ payload: null, trace, step: 0, options: {} })
    const { el } = mount(model)
    const tree = el.querySelector('[aria-label^="Branch tree"]')
    expect(tree).not.toBeNull()
    expect(el.querySelectorAll('[data-node-id]').length).toBe(3)
  })

  it('draws a Turing machine run — moves read arrays, and the widget converts them to arc labels', () => {
    // As the engine shapes it: no `kind` field, a tape alphabet and a blank.
    const tm = {
      states: ['q0', 'q1'],
      inputAlphabet: ['0'],
      tapeAlphabet: ['0', 'B'],
      blank: 'B',
      tapes: 1,
      transitions: [{ id: 't', from: 'q0', read: ['0'], write: ['B'], move: ['R'], to: 'q1' }],
      start: 'q0',
      accepting: ['q1'],
    }
    const trace = {
      ...TRACE,
      kind: 'simulate.tm',
      steps: [
        {
          ...TRACE.steps[0],
          snapshot: {
            machine: tm,
            current: { state: 'q0', tapes: [{ cells: ['0'], offset: 0, head: 0 }] },
            moves: 0,
            status: 'running',
          },
        },
      ],
      meta: { stepCount: 1, counters: {} },
    } as unknown as Trace
    const model = makeModel({ payload: null, trace, step: 0, options: {} })
    const { el } = mount(model)
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.textContent).toContain('0/B →')
    expect(el.querySelector('[data-position="0"]')).not.toBeNull()
  })

  it('draws a bare machine payload with no trace at all', () => {
    const model = makeModel({ payload: MACHINE, trace: null, step: 0, options: {} })
    const { el } = mount(model)
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.querySelector('input[type="range"]')).toBeNull()
  })
})
