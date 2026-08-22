'use client'

/**
 * The PDA simulator page: the gallery machines, run one at a time.
 */

import { useState } from 'react'
import { PDA_PRESETS, checkDeterminism } from '@tape-n-trace/engine'
import { PdaRunner } from './pda-runner'

export function PdaWorkbench(): React.JSX.Element {
  const [presetId, setPresetId] = useState(PDA_PRESETS[0]?.id ?? 'anbn')
  const preset = PDA_PRESETS.find((p) => p.id === presetId) ?? (PDA_PRESETS[0] as (typeof PDA_PRESETS)[number])
  const determinism = checkDeterminism(preset.machine)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Machines">
        {PDA_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === presetId}
            onClick={() => setPresetId(p.id)}
            style={{
              fontSize: 13,
              padding: '6px 12px',
              borderRadius: 'var(--tnt-radius)',
              border: p.id === presetId ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
              background: p.id === presetId ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      <p style={{ margin: 0, maxWidth: '64ch' }}>
        {preset.blurb}{' '}
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          (Hopcroft 2e §{preset.citation} · accepts by{' '}
          {preset.machine.acceptBy === 'finalState' ? 'final state' : 'empty stack'} ·{' '}
          {determinism.deterministic
            ? 'deterministic — a DPDA'
            : `nondeterministic — ${determinism.violations.length} overlapping move pair${determinism.violations.length === 1 ? '' : 's'}`}
          , see <a href="/edit/pda">the editor</a> for the pair-by-pair report)
        </span>
      </p>

      <PdaRunner key={preset.id} machine={preset.machine} suggested={preset.suggested} />
    </div>
  )
}
