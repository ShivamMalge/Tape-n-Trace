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
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Direction">
        {(
          [
            ['final-to-empty', 'Final state → empty stack (Thm 6.11)'],
            ['empty-to-final', 'Empty stack → final state (Thm 6.9)'],
          ] as [Direction, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={direction === value}
            onClick={() => setDirection(value)}
            style={{
              fontSize: 13,
              padding: '6px 12px',
              borderRadius: 'var(--tnt-radius)',
              border: direction === value ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
              background: direction === value ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          Machine ({wanted === 'finalState' ? 'accepts by final state' : 'accepts by empty stack'}):
        </span>
        {eligible.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === preset?.id}
            onClick={() => setPresetId(p.id)}
            style={{
              fontSize: 13,
              padding: '3px 10px',
              borderRadius: 999,
              border: p.id === preset?.id ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
              background: p.id === preset?.id ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      {snapshot === null ? null : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <section>
            <h2 style={{ fontSize: 15 }}>Original — {wanted === 'finalState' ? 'L(P)' : 'N(P)'}</h2>
            <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
              <AutomatonRenderer machine={pdaToDrawable(snapshot.source)} step={step} instanceId="acc-src" />
            </div>
          </section>
          <section>
            <h2 style={{ fontSize: 15 }}>Converted — {wanted === 'finalState' ? 'N(P′)' : 'L(P′)'}</h2>
            <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
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
          <h2 style={{ fontSize: 15 }}>Both machines on the same strings</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            The theorem says the languages are equal; here is a sample of it. (A sample is evidence,
            not the proof — the proof is the construction above.)
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--tnt-mono)' }}>
              <thead>
                <tr>
                  {['w', 'original', 'converted'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '4px 14px 4px 0', borderBottom: '1px solid var(--tnt-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((word) => (
                  <tr key={word || 'ε'}>
                    <td style={{ padding: '3px 14px 3px 0' }}>{word === '' ? 'ε' : word}</td>
                    <td style={{ padding: '3px 14px 3px 0' }}>{verdictText(preset.machine, word)}</td>
                    <td style={{ padding: '3px 14px 3px 0' }}>{verdictText(target, word)}</td>
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
