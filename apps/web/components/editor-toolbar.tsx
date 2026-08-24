'use client'

/**
 * The editor's toolbar: mode, history, machine kind, tidy-up, export.
 *
 * A `role="toolbar"` with real buttons rather than a row of icons, so the whole
 * editor is reachable by keyboard. Every control here has a keyboard equivalent
 * announced in its title.
 */

import type { FiniteAutomaton } from '@tape-n-trace/engine'

export type EditorMode = 'draw' | 'move'

export interface EditorToolbarProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  kind: FiniteAutomaton['kind']
  onKindChange: (kind: FiniteAutomaton['kind']) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onTidy: () => void
  tidying: boolean
  onExport: (format: 'svg' | 'png' | 'tnt') => void
  onReset: () => void
}

export function EditorToolbar({
  mode,
  onModeChange,
  kind,
  onKindChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTidy,
  tidying,
  onExport,
  onReset,
}: EditorToolbarProps): React.JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Editor tools"
      className="tnt-card tnt-row"
      style={{ padding: 'var(--tnt-space-2) var(--tnt-space-3)' }}
    >
      <div role="group" aria-label="Pointer mode" className="tnt-row tnt-row-tight">
        <Toggle
          active={mode === 'draw'}
          onClick={() => onModeChange('draw')}
          title="Draw (D) — click empty space to add a state, drag between states to connect them"
        >
          Draw
        </Toggle>
        <Toggle
          active={mode === 'move'}
          onClick={() => onModeChange('move')}
          title="Move (M) — drag states to reposition them"
        >
          Move
        </Toggle>
      </div>

      <Divider />

      <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="tnt-btn">
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="tnt-btn"
      >
        Redo
      </button>

      <Divider />

      <label className="tnt-field-row">
        <span className="tnt-muted">Kind</span>
        <select
          value={kind}
          onChange={(event) => onKindChange(event.target.value as FiniteAutomaton['kind'])}
          aria-label="Machine kind"
          className="tnt-input"
        >
          <option value="DFA">DFA</option>
          <option value="NFA">NFA</option>
          <option value="ENFA">ε-NFA</option>
        </select>
      </label>

      <Divider />

      <button
        type="button"
        onClick={onTidy}
        disabled={tidying}
        title="Lay the diagram out in layers, ranked by distance from the start state"
        className="tnt-btn"
      >
        {tidying ? 'Tidying…' : 'Tidy up'}
      </button>

      <Divider />

      <div role="group" aria-label="Export" className="tnt-row tnt-row-tight">
        <button type="button" onClick={() => onExport('svg')} title="Download as SVG" className="tnt-btn">
          SVG
        </button>
        <button type="button" onClick={() => onExport('png')} title="Download as PNG" className="tnt-btn">
          PNG
        </button>
        <button
          type="button"
          onClick={() => onExport('tnt')}
          title="Download the machine as a .tnt file, which reopens here"
          className="tnt-btn"
        >
          .tnt
        </button>
      </div>

      <Divider />

      <button type="button" onClick={onReset} title="Discard this machine and start again" className="tnt-btn">
        Clear
      </button>
    </div>
  )
}

function Toggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className="tnt-btn"
    >
      {children}
    </button>
  )
}

/** A hairline between groups of controls; there is no primitive for a rule. */
function Divider(): React.JSX.Element {
  return (
    <span aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--tnt-border)' }} />
  )
}
