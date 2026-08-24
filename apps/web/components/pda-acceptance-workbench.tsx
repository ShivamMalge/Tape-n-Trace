'use client'

/**
 * Acceptance-mode conversions, §6.2.3–6.2.4 — animated.
 *
 * Pick a machine and a direction; the new start state, the bottom marker and
 * the added ε-transitions arrive step by step. Underneath, both machines run
 * the same sample so "accepts the same language" is watched on strings rather
 * than taken on faith.
 */

import { useMemo, useState } from 'react'
import {
  PDA_PRESETS,
  acceptsPDA,
  emptyStackToFinalState,
  finalStateToEmptyStack,
  isOk,
} from '@tape-n-trace/engine'
import type { PDA, PdaAcceptanceTrace } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { NarrationPanel } from './narration-panel'
import { usePlayback } from '../lib/use-playback'
import { pdaToDrawable } from '../lib/pda-drawable'

type Direction = 'final-to-empty' | 'empty-to-final'

function verdictText(machine: PDA, word: string): string {
  const verdict = acceptsPDA(machine, word)
  if (verdict === null) return '—'
  return verdict ? 'accepts' : 'rejects'
}

export function PdaAcceptanceWorkbench(): React.JSX.Element {
  const [direction, setDirection] = useState<Direction>('final-to-empty')
  const wanted: PDA['acceptBy'] = direction === 'final-to-empty' ? 'finalState' : 'emptyStack'
  const eligible = PDA_PRESETS.filter((p) => p.machine.acceptBy === wanted)

  const [presetId, setPresetId] = useState('anbn')
  const preset = eligible.find((p) => p.id === presetId) ?? eligible[0]

  const trace = useMemo<PdaAcceptanceTrace | null>(() => {
    if (preset === undefined) return null
    const result =
      direction === 'final-to-empty'
        ? finalStateToEmptyStack(preset.machine)
        : emptyStackToFinalState(preset.machine)
    return isOk(result) ? result.value : null
  }, [preset, direction])

  const playback = usePlayback(trace)
  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot ?? null

  const target = trace === null || trace.result.type !== 'machine' ? null : (trace.result.machine as PDA)
  const sample = preset?.suggested ?? []

  return (
    <div className="tnt-stack">
      <div className="tnt-row" role="group" aria-label="Direction">
        {(
          [
            ['final-to-empty', 'Final state → empty stack (Thm 6.11)'],
            ['empty-to-final', 'Empty stack → final state (Thm 6.9)'],
          ] as [Direction, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="tnt-btn"
            aria-pressed={direction === value}
            onClick={() => setDirection(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tnt-row tnt-row-tight">
        <span className="tnt-sm tnt-muted">
          Machine ({wanted === 'finalState' ? 'accepts by final state' : 'accepts by empty stack'}):
        </span>
        {eligible.map((p) => (
          <button
            key={p.id}
            type="button"
            className="tnt-chip"
            aria-pressed={p.id === preset?.id}
            onClick={() => setPresetId(p.id)}
          >
            {p.title}
          </button>
        ))}
      </div>

      {snapshot === null ? null : (
        <div className="tnt-panels">
          <section>
            <h2>Original — {wanted === 'finalState' ? 'L(P)' : 'N(P)'}</h2>
            <div className="tnt-card tnt-card-plain">
              <AutomatonRenderer machine={pdaToDrawable(snapshot.source)} step={step} instanceId="acc-src" />
            </div>
          </section>
          <section>
            <h2>Converted — {wanted === 'finalState' ? 'N(P′)' : 'L(P′)'}</h2>
            <div className="tnt-card tnt-card-plain">
              <AutomatonRenderer machine={pdaToDrawable(snapshot.target)} step={step} instanceId="acc-tgt" />
            </div>
          </section>
        </div>
      )}

      <TransportBar
        stepIndex={playback.stepIndex}
        stepCount={playback.stepCount}
        playing={playback.playing}
        speed={playback.speed}
        onStepChange={playback.setStepIndex}
        onPlayingChange={playback.setPlaying}
        onSpeedChange={playback.setSpeed}
        narration={step?.narration}
      />

      <NarrationPanel step={step} />

      {target === null || preset === undefined ? null : (
        <section aria-label="Sample agreement">
          <h2>Both machines on the same strings</h2>
          <p className="tnt-sm tnt-muted" style={{ marginTop: 0 }}>
            The theorem says the languages are equal; here is a sample of it. (A sample is evidence,
            not the proof — the proof is the construction above.)
          </p>
          <div className="tnt-card tnt-scroll-x tnt-card-plain">
            <table className="tnt-table tnt-mono">
              <thead>
                <tr>
                  {['w', 'original', 'converted'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((word) => (
                  <tr key={word || 'ε'}>
                    <td>{word === '' ? 'ε' : word}</td>
                    <td>{verdictText(preset.machine, word)}</td>
                    <td>{verdictText(target, word)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
