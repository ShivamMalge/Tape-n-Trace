'use client'

/**
 * The diagonalization table — Hopcroft 2e §9.1, phases.md P1.7.
 *
 * The controller. It owns which window on Fig. 9.1 is showing and which cell is
 * selected; the engine computes every cell, `DiagonalGrid` draws them, and
 * `CodeInspector` explains one.
 *
 * The presets are the point of the page. A table that starts at row 1 is
 * correct and completely blank — the footnote to Fig. 9.1 says the top rows are
 * solid 0s, and here they demonstrably are — so the presets carry a student to
 * the three rows where something happens: the first well-formed code, the first
 * machine that accepts anything, and the first that fails to halt.
 */

import { useMemo, useState } from 'react'
import {
  DEFAULT_CELL_BUDGET,
  FIRST_ACCEPTING_CODE_INDEX,
  FIRST_CODE_INDEX,
  FIRST_NON_HALTING_CODE_INDEX,
  diagonalArgument,
  diagonalTable,
} from '@tape-n-trace/engine'
import { TransportBar } from '@tape-n-trace/ui'
import { usePlayback } from '../lib/use-playback'
import { NarrationPanel } from './narration-panel'
import { CodeInspector } from './code-inspector'
import { DiagonalGrid, type CellRef } from './diagonal-grid'

interface Preset {
  id: string
  label: string
  blurb: string
  fromRow: number
  fromCol: number
}

const PRESETS: Preset[] = [
  {
    id: 'top',
    label: 'The top of the table',
    blurb:
      'Rows 1 onwards. Every one of these strings is too short to be a code, so every machine is the one with no moves and every cell is 0 — which is exactly what the footnote to Fig. 9.1 says the real table looks like here.',
    fromRow: 1,
    fromCol: 1,
  },
  {
    id: 'first-code',
    label: `The first real code (row ${FIRST_CODE_INDEX})`,
    blurb: `A code needs five runs of 0s and four separating 1s, so the shortest is nine bits: w${FIRST_CODE_INDEX} = 010101010. It reads a 0, writes a 0 and moves left — off the input and onto a blank, where it has no move and dies. Rows ${FIRST_CODE_INDEX + 1} onwards are back to ill-formed.`,
    fromRow: FIRST_CODE_INDEX,
    fromCol: 1,
  },
  {
    id: 'first-accepting',
    label: `The first machine that accepts (row ${FIRST_ACCEPTING_CODE_INDEX})`,
    blurb: `w${FIRST_ACCEPTING_CODE_INDEX} codes δ(q₁, X₁) = (q₂, X₁, D₁): read a 0 and enter the accepting state. So this is the first row of the whole table with a 1 in it, and it has one under every column whose string begins with 0.`,
    fromRow: FIRST_ACCEPTING_CODE_INDEX,
    fromCol: 1,
  },
  {
    id: 'first-loop',
    label: `A machine that never halts (row ${FIRST_NON_HALTING_CODE_INDEX})`,
    blurb: `w${FIRST_NON_HALTING_CODE_INDEX} codes δ(q₁, X₃) = (q₁, X₁, D₁): on a blank, write a 0 and move left. Given the empty string it does that for ever. The cell under column 1 is the one the step budget cannot fill, and it says so rather than guessing.`,
    fromRow: FIRST_NON_HALTING_CODE_INDEX,
    fromCol: 1,
  },
  {
    id: 'diagonal',
    label: 'The diagonal itself',
    blurb: `Rows and columns starting together, so cell (i, i) is on screen for every row. That cell asks whether Mᵢ accepts its own code — the question the whole chapter turns on.`,
    fromRow: FIRST_ACCEPTING_CODE_INDEX,
    fromCol: FIRST_ACCEPTING_CODE_INDEX,
  },
]

const SIZE = 12

export function DiagonalWorkbench(): React.JSX.Element {
  const [presetId, setPresetId] = useState('top')
  const [budget, setBudget] = useState(DEFAULT_CELL_BUDGET)
  const [selected, setSelected] = useState<CellRef | null>(null)
  const [showComplement, setShowComplement] = useState(false)
  const [arguing, setArguing] = useState(false)

  const preset = (PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]) as Preset

  const table = useMemo(
    () => diagonalTable({ fromRow: preset.fromRow, fromCol: preset.fromCol, size: SIZE, stepBudget: budget }),
    [preset.fromRow, preset.fromCol, budget],
  )

  const trace = useMemo(() => (arguing ? diagonalArgument(table) : null), [arguing, table])
  const playback = usePlayback(trace)
  const step = trace === null ? null : (trace.steps[playback.stepIndex] ?? null)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div role="group" aria-label="Where to look" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === preset.id}
            onClick={() => {
              setPresetId(p.id)
              setSelected(null)
              setArguing(false)
            }}
            style={{
              fontSize: 13,
              padding: '4px 10px',
              borderRadius: 999,
              border: p.id === preset.id ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
              background: p.id === preset.id ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 14, maxWidth: '76ch' }}>{preset.blurb}</p>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Moves per cell
          <input
            type="number"
            min={1}
            max={2000}
            step={20}
            value={budget}
            onChange={(e) => setBudget(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
            style={{ width: 84, font: 'inherit', padding: '2px 6px' }}
          />
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={showComplement} onChange={(e) => setShowComplement(e.target.checked)} />
          Complement the diagonal
        </label>
        <button
          type="button"
          onClick={() => setArguing((on) => !on)}
          style={{
            font: 'inherit',
            padding: '4px 12px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: arguing ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
            cursor: 'pointer',
          }}
        >
          {arguing ? 'Hide the argument' : 'Walk Theorem 9.2'}
        </button>
        {table.aligned ? null : (
          <span className="tnt-muted" style={{ fontSize: 12 }}>
            The rows and columns start in different places, so the diagonal is off screen — the last preset lines them up.
          </span>
        )}
      </div>

      <DiagonalGrid table={table} selected={selected} onSelect={setSelected} showComplement={showComplement} />

      {trace === null ? null : (
        <div style={{ display: 'grid', gap: 10 }}>
          <TransportBar
            stepIndex={playback.stepIndex}
            stepCount={trace.steps.length}
            playing={playback.playing}
            speed={playback.speed}
            onStepChange={playback.setStepIndex}
            onPlayingChange={playback.setPlaying}
            onSpeedChange={playback.setSpeed}
          />
          <NarrationPanel step={step} />
        </div>
      )}

      <CodeInspector table={table} selected={selected} />
    </div>
  )
}
