'use client'

/**
 * The machine editor — the controller half of the editing triad.
 *
 * Owns the machine, the undo history, the pointer mode and the selection. The
 * canvas below it decides what a gesture means; the engine's `fa/edit` module
 * performs the change; this component is the only thing that knows both.
 *
 * Every violation of the machine is shown at once, live, while it is being drawn
 * — `validateFA` returns them all for exactly this (§4).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addState,
  addTransition,
  applyLayout,
  emptyMachine,
  isErr,
  moveState,
  removeState,
  removeTransition,
  renameState,
  setEdgeLabels,
  setKind,
  setStart,
  toggleAccepting,
  validateFA,
} from '@tape-n-trace/engine'
import type { FiniteAutomaton, Read, StateId, TransitionId, ValidationError } from '@tape-n-trace/engine'
import { EditorCanvas } from './editor-canvas'
import { EditorToolbar, type EditorMode } from './editor-toolbar'
import { EdgeLabelEditor } from './edge-label-editor'
import { StateInspector } from './state-inspector'
import { TransitionInspector } from './transition-inspector'
import { ValidationErrors } from './validation-errors'
import { useMachineHistory } from '../lib/use-machine-history'
import { formatEdgeLabel, parseEdgeLabel } from '../lib/edge-labels'
import { autoLayout } from '../lib/auto-layout'
import { downloadBlob, downloadText, suggestFilename, svgToPngBlob, svgToString, toTntJson } from '../lib/export'

/**
 * `onMachineChange` reports every committed edit upward, so a parent — the
 * exercise workbench — can grade what is currently drawn without owning the
 * editing state itself. The editor stays the single owner of the machine.
 */
export function MachineEditor({
  initial,
  onMachineChange,
}: {
  initial?: FiniteAutomaton
  onMachineChange?: (machine: FiniteAutomaton) => void
}): React.JSX.Element {
  const history = useMachineHistory(initial ?? emptyMachine())
  const { machine, commit, reset, undo, redo, canUndo, canRedo } = history

  useEffect(() => {
    onMachineChange?.(machine)
  }, [machine, onMachineChange])

  const [mode, setMode] = useState<EditorMode>('draw')
  const [selected, setSelected] = useState<StateId | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ from: StateId; to: StateId } | null>(null)
  const [tidying, setTidying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const validation = validateFA(machine)
  const errors: ValidationError[] = isErr(validation) ? validation.errors : []

  // Keyboard shortcuts. Bound to the editor's own container rather than the
  // window, so they cannot fire while a student is typing in an input.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
    if (typing) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if (event.key === 'd' || event.key === 'D') setMode('draw')
    if (event.key === 'm' || event.key === 'M') setMode('move')
    if (event.key === 'a' || event.key === 'A') commit(addState(machine).machine)
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected !== null) {
      event.preventDefault()
      commit(removeState(machine, selected))
      setSelected(null)
    }
  }

  const handleMove = useCallback(
    (id: StateId, at: { x: number; y: number }, settled: boolean) => {
      // One drag is one undo entry: every intermediate position coalesces, and
      // the final one closes the group.
      commit(moveState(machine, id, at), settled ? {} : { coalesce: `move:${id}` })
    },
    [commit, machine],
  )

  const tidy = async (): Promise<void> => {
    setTidying(true)
    const layout = await autoLayout(machine)
    setTidying(false)
    if (layout === null) {
      setNotice('The auto-layout could not run, so the diagram was left as it is.')
      return
    }
    commit(applyLayout(machine, layout))
  }

  const exportAs = async (format: 'svg' | 'png' | 'tnt'): Promise<void> => {
    if (format === 'tnt') {
      downloadText(toTntJson(machine), suggestFilename(machine, 'tnt'), 'application/json')
      return
    }

    const svg = svgRef.current
    if (svg === null) return

    if (format === 'svg') {
      downloadText(svgToString(svg), suggestFilename(machine, 'svg'), 'image/svg+xml')
      return
    }

    const blob = await svgToPngBlob(svg)
    if (blob === null) {
      setNotice('The diagram could not be turned into a PNG. The SVG export still works.')
      return
    }
    downloadBlob(blob, suggestFilename(machine, 'png'))
  }

  // Clear a notice once the machine changes under it.
  useEffect(() => setNotice(null), [machine])

  const currentLabel =
    editingEdge === null
      ? ''
      : formatEdgeLabel(
          machine.transitions
            .filter((t) => t.from === editingEdge.from && t.to === editingEdge.to)
            .map((t) => t.read),
        )

  return (
    <div onKeyDown={onKeyDown} className="tnt-stack">
      <EditorToolbar
        mode={mode}
        onModeChange={setMode}
        kind={machine.kind}
        onKindChange={(kind) => commit(setKind(machine, kind))}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onTidy={() => void tidy()}
        tidying={tidying}
        onExport={(format) => void exportAs(format)}
        onReset={() => {
          reset(emptyMachine(machine.kind, machine.alphabet))
          setSelected(null)
        }}
      />

      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        Click empty space to add a state. Drag one state onto another to connect them. Double-click a
        state to make it accepting, right-click it to make it the start. Click an edge to edit its label.
      </p>

      <EditorCanvas
        machine={machine}
        mode={mode}
        selected={selected}
        svgRef={svgRef}
        onSelect={setSelected}
        onAddStateAt={(at) => commit(addState(machine, { at }).machine)}
        onConnect={(from, to) => setEditingEdge({ from, to })}
        onMoveState={handleMove}
        onToggleAccepting={(id) => commit(toggleAccepting(machine, id))}
        onSetStart={(id) => commit(setStart(machine, id))}
        onEditEdge={(ids) => {
          const first = machine.transitions.find((t) => ids.includes(t.id))
          if (first !== undefined) setEditingEdge({ from: first.from, to: first.to })
        }}
      />

      {notice === null ? null : (
        <p role="status" className="tnt-sm" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
          {notice}
        </p>
      )}

      {editingEdge === null ? null : (
        <EdgeLabelEditor
          from={editingEdge.from}
          to={editingEdge.to}
          initial={currentLabel}
          allowEpsilon={machine.kind === 'ENFA'}
          onCancel={() => setEditingEdge(null)}
          onCommit={(text) => {
            commit(setEdgeLabels(machine, editingEdge.from, editingEdge.to, parseEdgeLabel(text)))
            setEditingEdge(null)
          }}
        />
      )}

      <ValidationErrors errors={errors} />

      <StateInspector
        machine={machine}
        selected={selected}
        onSelect={setSelected}
        onAdd={() => commit(addState(machine).machine)}
        onRemove={(id) => {
          commit(removeState(machine, id))
          if (selected === id) setSelected(null)
        }}
        onRename={(from, to) => commit(renameState(machine, from, to))}
        onToggleAccepting={(id) => commit(toggleAccepting(machine, id))}
        onSetStart={(id) => commit(setStart(machine, id))}
      />

      <TransitionInspector
        machine={machine}
        onAdd={(from: StateId, read: Read, to: StateId) => commit(addTransition(machine, from, read, to))}
        onRemove={(id: TransitionId) => commit(removeTransition(machine, id))}
      />
    </div>
  )
}
