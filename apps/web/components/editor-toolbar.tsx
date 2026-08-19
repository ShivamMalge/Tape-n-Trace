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
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '8px 12px',
        border: '1px solid var(--tnt-border)',
        borderRadius: 'var(--tnt-radius)',
        background: 'var(--tnt-surface)',
      }}
    >
      <div role="group" aria-label="Pointer mode" style={{ display: 'flex', gap: 4 }}>
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

      <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={button(!canUndo)}>
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        style={button(!canRedo)}
      >
        Redo
      </button>

      <Divider />

      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
        <span className="tnt-muted">Kind</span>
        <select
          value={kind}
          onChange={(event) => onKindChange(event.target.value as FiniteAutomaton['kind'])}
          aria-label="Machine kind"
          style={select}
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
        style={button(tidying)}
      >
        {tidying ? 'Tidying…' : 'Tidy up'}
      </button>

      <Divider />

      <div role="group" aria-label="Export" style={{ display: 'flex', gap: 4 }}>
        <button type="button" onClick={() => onExport('svg')} title="Download as SVG" style={button(false)}>
          SVG
        </button>
        <button type="button" onClick={() => onExport('png')} title="Download as PNG" style={button(false)}>
          PNG
        </button>
        <button
          type="button"
          onClick={() => onExport('tnt')}
          title="Download the machine as a .tnt file, which reopens here"
          style={button(false)}
        >
          .tnt
        </button>
      </div>

      <Divider />

      <button type="button" onClick={onReset} title="Discard this machine and start again" style={button(false)}>
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
      style={{
        ...button(false),
        background: active ? 'var(--tnt-current)' : 'var(--tnt-bg)',
        color: active ? '#fff' : 'var(--tnt-text)',
        borderColor: active ? 'var(--tnt-current)' : 'var(--tnt-border)',
      }}
    >
      {children}
    </button>
  )
}

function Divider(): React.JSX.Element {
  return <span aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--tnt-border)' }} />
}

function button(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 11px',
    borderRadius: 'var(--tnt-radius)',
    border: '1px solid var(--tnt-border)',
    background: 'var(--tnt-bg)',
    color: 'var(--tnt-text)',
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  }
}

const select: React.CSSProperties = {
  fontFamily: 'var(--tnt-font)',
  fontSize: 13,
  padding: '3px 5px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
}
