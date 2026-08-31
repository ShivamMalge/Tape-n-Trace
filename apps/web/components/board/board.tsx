'use client'

/**
 * The classroom board — design artboard 07, phases.md §5.
 *
 * A dark dotted board a lecturer draws on with a pen or a finger. Every stroke
 * is recognised (`lib/board-recognize.ts`) and redrawn cleanly: a loop becomes
 * a state, a stroke between two states an arc, a loop inside a state its
 * accepting ring, a stroke into a state from its left the start marker, a
 * scribble rubs a state out. Labels come from a chip picker — the alphabet
 * plus ε — never from handwriting. Simulate slides the panel in: the δ table
 * that has been growing as the machine did, an input with Try chips, and a
 * transport that walks the engine's own trace with the current states lit.
 *
 * The board owns no automata logic. The machine is the engine's
 * `FiniteAutomaton`, built with the engine's editing operations, checked by
 * `validateFA`, and run by `simulate` — the same functions the editor and the
 * simulator pages use (architecture.md §2, §10.1).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addState,
  addTransition,
  faTransitionId,
  isOk,
  removeState,
  removeTransition,
  setStart,
  simulate,
  toggleAccepting,
  validateFA,
} from '@tape-n-trace/engine'
import type { FiniteAutomaton, Point, Read, StateId, Trace } from '@tape-n-trace/engine'
import { groupTransitions } from '@tape-n-trace/ui'
import { recognise, type PlacedState } from '../../lib/board-recognize'
import { useMachineHistory } from '../../lib/use-machine-history'
import { usePlayback } from '../../lib/use-playback'
import { BoardCanvas, type Ink, type Lit } from './board-canvas'
import { BoardPicker, BoardTools } from './board-chrome'
import { BoardPanel } from './board-panel'
import { hintFor, pretty } from './board-text'

export { pretty } from './board-text'

const EMPTY: FiniteAutomaton = {
  kind: 'ENFA',
  states: [],
  alphabet: ['0', '1'],
  transitions: [],
  start: '',
  accepting: [],
  layout: {},
}

interface Pending {
  from: StateId
  to: StateId
  at: Point
}

export interface BoardProps {
  /** The course tag in the corner — "BTOCH503 · L2". */
  tag?: string
  initial?: FiniteAutomaton
  /** Start with the panel out — a page opened on a worked example. */
  openInitially?: boolean
}

export function Board({ tag = 'BTOCH503 · L2', initial = EMPTY, openInitially = false }: BoardProps): React.JSX.Element {
  const history = useMachineHistory(initial)
  const machine = history.machine

  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 1118, height: 660 })
  const [drawing, setDrawing] = useState<Point[] | null>(null)
  const [lastInk, setLastInk] = useState<Ink | null>(null)
  const [freshState, setFreshState] = useState<StateId | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [badge, setBadge] = useState<string | null>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [marking, setMarking] = useState(false)

  const [open, setOpen] = useState(openInitially)
  const [input, setInput] = useState('')
  const [ran, setRan] = useState<string | null>(null)
  const [trace, setTrace] = useState<Trace | null>(null)
  const playback = usePlayback(trace)

  // The board is drawn 1:1 — one machine unit per CSS pixel — so a stroke lands
  // exactly where the pen was. Measured on mount and on resize.
  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return
    const measure = (): void => {
      const rect = svg.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const placed = useMemo<PlacedState[]>(
    () => machine.states.map((id) => ({ id, at: machine.layout?.[id] ?? { x: 0, y: 0 } })),
    [machine],
  )
  const groups = useMemo(() => groupTransitions(machine), [machine])
  const problems = useMemo(() => {
    if (machine.states.length === 0) return []
    const result = validateFA(machine)
    return isOk(result) ? [] : result.errors
  }, [machine])
  const runnable = machine.states.length > 0 && problems.length === 0

  const commit = useCallback(
    (next: FiniteAutomaton) => {
      history.commit(next)
      setTrace(null)
      setRan(null)
    },
    [history],
  )

  const pointOf = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const interpret = (points: Point[]): void => {
    const found = recognise(points, placed)
    setPending(null)
    setFreshState(null)

    switch (found.kind) {
      case 'state': {
        const { machine: next, id } = addState(machine, { at: found.at })
        commit(next)
        setLastInk({ points, role: 'state' })
        setFreshState(id)
        setBadge(`stroke → state · named ${pretty(id)}${next.states.length === 1 ? ' · the start state' : ''}`)
        return
      }
      case 'accepting':
        commit(toggleAccepting(machine, found.state))
        setLastInk(null)
        setBadge(
          machine.accepting.includes(found.state)
            ? `${pretty(found.state)} is no longer accepting`
            : `stroke → second ring · ${pretty(found.state)} is accepting`,
        )
        return
      case 'arc':
        setLastInk({ points, role: 'arc' })
        setPending({ from: found.from, to: found.to, at: found.at })
        setBadge(
          found.from === found.to
            ? `stroke → loop on ${pretty(found.from)} · pick its symbols`
            : `stroke → arc ${pretty(found.from)} → ${pretty(found.to)} · pick its symbols`,
        )
        return
      case 'start':
        commit(setStart(machine, found.state))
        setLastInk(null)
        setBadge(`stroke → start marker · ${pretty(found.state)} is the start state`)
        return
      case 'scrub':
        commit(removeState(machine, found.state))
        setLastInk(null)
        setBadge(`scribble → ${pretty(found.state)} rubbed out, with its arcs`)
        return
      case 'tap':
        if (found.state === null) {
          setBadge(null)
          return
        }
        if (tool === 'eraser') {
          commit(removeState(machine, found.state))
          setBadge(`${pretty(found.state)} rubbed out, with its arcs`)
          return
        }
        // A tap on a state toggles its accepting ring; "mark accepting" says so.
        commit(toggleAccepting(machine, found.state))
        setBadge(
          machine.accepting.includes(found.state)
            ? `${pretty(found.state)} is no longer accepting`
            : `${pretty(found.state)} marked accepting`,
        )
        return
      case 'nothing':
        setLastInk(null)
        setBadge(`not recognised: ${found.why}`)
        return
    }
  }

  // The chip picker: each symbol toggles that transition on the pending arc.
  const symbols: Read[] = [...machine.alphabet, null]
  const arcHas = (read: Read): boolean =>
    pending !== null && machine.transitions.some((t) => t.id === faTransitionId(pending.from, read, pending.to))
  const toggleSymbol = (read: Read): void => {
    if (pending === null) return
    const id = faTransitionId(pending.from, read, pending.to)
    commit(arcHas(read) ? removeTransition(machine, id) : addTransition(machine, pending.from, read, pending.to))
  }

  const run = (word: string): void => {
    const result = simulate(machine, word)
    setRan(word)
    setTrace(isOk(result) ? (result.value as Trace) : null)
    setOpen(true)
  }

  const step = trace?.steps[playback.stepIndex] ?? null
  const lit = useMemo<Lit>(() => {
    const states = new Map<StateId, string>()
    const edges = new Set<string>()
    for (const h of step?.highlight ?? []) {
      if (h.type === 'state') states.set(h.id, h.role)
      if (h.type === 'transition') edges.add(h.id)
    }
    return { states, edges }
  }, [step])
  const atEnd = playback.stepCount > 0 && playback.stepIndex === playback.stepCount - 1
  const verdict = trace !== null && atEnd ? trace.result : null
  const hint = hintFor(machine, groups.length, problems.map((p) => p.message), trace !== null)

  return (
    <div className="tnt-board" data-open={open ? 'true' : undefined}>
      <div className="tnt-board-stage">
        <BoardCanvas
          machine={machine}
          placed={placed}
          groups={groups}
          lit={lit}
          freshState={freshState}
          lastInk={lastInk}
          drawing={drawing}
          size={size}
          svgRef={svgRef}
          onPointerDown={(event) => {
            if (event.button !== 0 && event.pointerType === 'mouse') return
            event.currentTarget.setPointerCapture?.(event.pointerId)
            setDrawing([pointOf(event)])
          }}
          onPointerMove={(event) => {
            if (drawing !== null) setDrawing([...drawing, pointOf(event)])
          }}
          onPointerUp={(event) => {
            if (drawing === null) return
            const points = [...drawing, pointOf(event)]
            setDrawing(null)
            interpret(points)
          }}
          onPointerCancel={() => setDrawing(null)}
        />

        <div className="tnt-board-brand">
          <span className="tnt-brand-glyph" aria-hidden="true">
            <span />
            <span data-lit="true" />
            <span />
          </span>
          <span className="tnt-board-title">Board</span>
          <span className="tnt-board-tag">{tag}</span>
        </div>

        <BoardTools
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          tool={tool}
          onTool={setTool}
        />

        {badge === null ? null : (
          <div className="tnt-board-badge" role="status">
            <span className="tnt-board-badge-dot" aria-hidden="true" />
            <span>{badge}</span>
          </div>
        )}

        {pending === null ? null : (
          <BoardPicker from={pending.from} to={pending.to} at={pending.at} bounds={size} symbols={symbols} has={arcHas} onToggle={toggleSymbol} />
        )}

        <div className="tnt-board-status">
          <span className="tnt-board-pill">
            {machine.states.length} {machine.states.length === 1 ? 'state' : 'states'} · {groups.length} {groups.length === 1 ? 'arc' : 'arcs'}
          </span>
          <button
            type="button"
            className="tnt-board-pill"
            aria-pressed={marking}
            onClick={() => {
              setMarking(!marking)
              setBadge(marking ? null : 'tap a state to mark it accepting — or draw a second loop inside it')
            }}
          >
            mark accepting
          </button>
        </div>

        <button type="button" className="tnt-board-simulate" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide table' : 'Simulate'}
        </button>
      </div>

      <BoardPanel
        open={open}
        machine={machine}
        symbols={symbols}
        lit={lit}
        hint={hint}
        runnable={runnable}
        input={input}
        onInput={setInput}
        ran={ran}
        onRun={run}
        playback={playback}
        step={step}
        verdict={verdict}
      />
    </div>
  )
}
