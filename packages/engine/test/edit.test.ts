/**
 * Editing operations.
 *
 * Two properties matter more than any individual behaviour, because the undo
 * stack and the renderer's memo caches both depend on them: every operation
 * returns a *new* machine, and never mutates the one it was given.
 */

import { describe, expect, it } from 'vitest'
import {
  addState,
  addTransition,
  applyLayout,
  emptyMachine,
  faTransitionId,
  moveState,
  nextStateName,
  removeState,
  removeTransition,
  renameState,
  setAlphabet,
  setEdgeLabels,
  setKind,
  setStart,
  toggleAccepting,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton } from '../src/index.js'
import { dfaContains01, enfaZerosThenOnes } from './helpers/machines.js'

describe('immutability — the undo stack depends on it', () => {
  const operations: [string, (m: FiniteAutomaton) => FiniteAutomaton][] = [
    ['addState', (m) => addState(m).machine],
    ['removeState', (m) => removeState(m, 'q1')],
    ['renameState', (m) => renameState(m, 'q1', 'z')],
    ['moveState', (m) => moveState(m, 'q1', { x: 5, y: 5 })],
    ['applyLayout', (m) => applyLayout(m, { q0: { x: 1, y: 1 } })],
    ['toggleAccepting', (m) => toggleAccepting(m, 'q1')],
    ['setStart', (m) => setStart(m, 'q1')],
    ['addTransition', (m) => addTransition(m, 'q0', '0', 'q2')],
    ['removeTransition', (m) => removeTransition(m, faTransitionId('q0', '0', 'q1'))],
    ['setEdgeLabels', (m) => setEdgeLabels(m, 'q0', 'q1', ['1'])],
    ['setKind', (m) => setKind(m, 'NFA')],
    ['setAlphabet', (m) => setAlphabet(m, ['0'])],
  ]

  it.each(operations)('%s leaves the original machine untouched', (_label, operate) => {
    const before = JSON.stringify(dfaContains01)
    const after = operate(dfaContains01)
    expect(JSON.stringify(dfaContains01)).toBe(before)
    expect(after).not.toBe(dfaContains01)
  })
})

describe('addState', () => {
  it('names states q0, q1, q2 — the first free one', () => {
    expect(nextStateName(emptyMachine())).toBe('q1')
    const { id } = addState(dfaContains01)
    expect(id).toBe('q3')
  })

  it('skips a name that is taken rather than colliding', () => {
    const machine: FiniteAutomaton = { ...emptyMachine(), states: ['q0', 'q2'] }
    expect(nextStateName(machine)).toBe('q1')
  })

  it('makes the first state of an empty machine the start state', () => {
    const blank: FiniteAutomaton = { ...emptyMachine(), states: [], start: '', layout: {} }
    const { machine, id } = addState(blank)
    expect(machine.start).toBe(id)
  })

  it('does not steal the start role from an existing state', () => {
    expect(addState(dfaContains01).machine.start).toBe('q0')
  })

  it('records where it was dropped', () => {
    const { machine, id } = addState(dfaContains01, { at: { x: 12, y: 34 } })
    expect(machine.layout?.[id]).toEqual({ x: 12, y: 34 })
  })
})

describe('removeState', () => {
  it('drops every transition that touched it', () => {
    const machine = removeState(dfaContains01, 'q1')
    expect(machine.states).not.toContain('q1')
    expect(machine.transitions.some((t) => t.from === 'q1' || t.to === 'q1')).toBe(false)
  })

  it('drops it from the accepting set and the layout', () => {
    const machine = removeState(dfaContains01, 'q2')
    expect(machine.accepting).not.toContain('q2')
    expect(machine.layout?.['q2']).toBeUndefined()
  })

  it('hands the start role on rather than leaving a dangling reference', () => {
    const machine = removeState(dfaContains01, 'q0')
    expect(machine.states).toContain(machine.start)
    expect(validateFA(machine).ok).toBe(true)
  })
})

describe('renameState', () => {
  it('renames it everywhere at once', () => {
    const machine = renameState(dfaContains01, 'q2', 'accept')
    expect(machine.states).toContain('accept')
    expect(machine.accepting).toEqual(['accept'])
    expect(machine.transitions.some((t) => t.to === 'accept')).toBe(true)
    expect(machine.transitions.some((t) => t.from === 'q2' || t.to === 'q2')).toBe(false)
    expect(machine.layout?.['accept']).toBeDefined()
    expect(validateFA(machine).ok).toBe(true)
  })

  it('regenerates transition ids, since an id encodes its endpoints', () => {
    const machine = renameState(dfaContains01, 'q0', 'start')
    expect(machine.transitions.every((t) => !t.id.includes('q0'))).toBe(true)
  })

  it('follows the start state', () => {
    expect(renameState(dfaContains01, 'q0', 'start').start).toBe('start')
  })

  it('is a no-op for a state that is not there, or a rename to itself', () => {
    expect(renameState(dfaContains01, 'ghost', 'x')).toBe(dfaContains01)
    expect(renameState(dfaContains01, 'q0', 'q0')).toBe(dfaContains01)
  })
})

describe('toggleAccepting and setStart', () => {
  it('toggles both ways', () => {
    const on = toggleAccepting(dfaContains01, 'q0')
    expect(on.accepting).toContain('q0')
    expect(toggleAccepting(on, 'q0').accepting).not.toContain('q0')
  })

  it('keeps the accepting set in machine order, so click order cannot change equality', () => {
    const a = toggleAccepting(toggleAccepting(dfaContains01, 'q0'), 'q1')
    const b = toggleAccepting(toggleAccepting(dfaContains01, 'q1'), 'q0')
    expect(a.accepting).toEqual(b.accepting)
    expect(a.accepting).toEqual(['q0', 'q1', 'q2'])
  })

  it('moves the start state', () => {
    expect(setStart(dfaContains01, 'q2').start).toBe('q2')
  })

  it('ignores a state that does not exist', () => {
    expect(setStart(dfaContains01, 'ghost')).toBe(dfaContains01)
    expect(toggleAccepting(dfaContains01, 'ghost')).toBe(dfaContains01)
  })
})

describe('transitions', () => {
  it('adds one, and adding it twice changes nothing', () => {
    const once = addTransition(dfaContains01, 'q2', '0', 'q0')
    expect(once.transitions).toHaveLength(dfaContains01.transitions.length + 1)
    expect(addTransition(once, 'q2', '0', 'q0')).toBe(once)
  })

  it('widens the alphabet when a new symbol is used', () => {
    expect(addTransition(dfaContains01, 'q0', 'x', 'q1').alphabet).toContain('x')
  })

  it('does not widen the alphabet for an ε-transition (ADR-002)', () => {
    expect(addTransition(enfaZerosThenOnes, 'B', null, 'A').alphabet).toEqual(
      enfaZerosThenOnes.alphabet,
    )
  })

  it('removes one by id', () => {
    const id = faTransitionId('q0', '0', 'q1')
    expect(removeTransition(dfaContains01, id).transitions.some((t) => t.id === id)).toBe(false)
  })
})

describe('setEdgeLabels', () => {
  /**
   * A drawn edge stands for a whole group of transitions (§7), so retyping its
   * label must delete the ones no longer named — otherwise a "removed" symbol
   * survives invisibly and the machine quietly means something else.
   */
  it('replaces the whole group rather than adding to it', () => {
    // q2 loops on both 0 and 1; retype it as just 1.
    const machine = setEdgeLabels(dfaContains01, 'q2', 'q2', ['1'])
    const loops = machine.transitions.filter((t) => t.from === 'q2' && t.to === 'q2')
    expect(loops).toHaveLength(1)
    expect(loops[0]?.read).toBe('1')
  })

  it('removes the edge entirely when given no labels', () => {
    const machine = setEdgeLabels(dfaContains01, 'q2', 'q2', [])
    expect(machine.transitions.some((t) => t.from === 'q2' && t.to === 'q2')).toBe(false)
  })

  it('leaves other edges alone', () => {
    const machine = setEdgeLabels(dfaContains01, 'q2', 'q2', ['1'])
    expect(machine.transitions.some((t) => t.from === 'q0' && t.read === '0')).toBe(true)
  })

  it('deduplicates repeated labels', () => {
    const machine = setEdgeLabels(dfaContains01, 'q0', 'q1', ['0', '0', '1'])
    expect(machine.transitions.filter((t) => t.from === 'q0' && t.to === 'q1')).toHaveLength(2)
  })

  it('treats ε as distinct from every symbol', () => {
    const machine = setEdgeLabels(enfaZerosThenOnes, 'A', 'B', [null, '0', null])
    expect(machine.transitions.filter((t) => t.from === 'A' && t.to === 'B')).toHaveLength(2)
  })
})

describe('setKind', () => {
  it('drops ε-transitions when leaving ε-NFA, so the result is at least well-formed', () => {
    const machine = setKind(enfaZerosThenOnes, 'NFA')
    expect(machine.transitions.some((t) => t.read === null)).toBe(false)
    expect(validateFA(machine).ok).toBe(true)
  })

  it('keeps them when staying an ε-NFA', () => {
    expect(setKind(enfaZerosThenOnes, 'ENFA').transitions).toEqual(enfaZerosThenOnes.transitions)
  })
})

describe('setAlphabet', () => {
  it('drops transitions on symbols that no longer exist', () => {
    const machine = setAlphabet(dfaContains01, ['0'])
    expect(machine.transitions.every((t) => t.read === '0')).toBe(true)
    expect(validateFA(machine).ok).toBe(true)
  })

  it('keeps ε-transitions, which do not belong to the alphabet', () => {
    expect(setAlphabet(enfaZerosThenOnes, []).transitions.some((t) => t.read === null)).toBe(true)
  })
})

describe('emptyMachine', () => {
  it('is valid and ready to draw on', () => {
    const machine = emptyMachine()
    expect(validateFA(machine).ok).toBe(true)
    expect(machine.states).toEqual(['q0'])
    expect(machine.layout?.['q0']).toBeDefined()
  })
})

describe('an editing session stays valid', () => {
  it('builds a working DFA from nothing through the operations an editor performs', () => {
    let machine = emptyMachine()
    const added = addState(machine, { at: { x: 240, y: 90 } })
    machine = added.machine
    machine = addTransition(machine, 'q0', '0', added.id)
    machine = addTransition(machine, 'q0', '1', 'q0')
    machine = addTransition(machine, added.id, '0', added.id)
    machine = addTransition(machine, added.id, '1', 'q0')
    machine = toggleAccepting(machine, added.id)

    expect(validateFA(machine).ok).toBe(true)
    expect(machine.kind).toBe('DFA')
    expect(machine.states).toEqual(['q0', 'q1'])
    expect(machine.accepting).toEqual(['q1'])
  })
})
