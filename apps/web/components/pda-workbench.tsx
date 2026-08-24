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
    <div className="tnt-stack">
      <div className="tnt-row" role="group" aria-label="Machines">
        {PDA_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="tnt-chip"
            aria-pressed={p.id === presetId}
            onClick={() => setPresetId(p.id)}
          >
            {p.title}
          </button>
        ))}
      </div>

      <p className="tnt-prose" style={{ margin: 0 }}>
        {preset.blurb}{' '}
        <span className="tnt-muted tnt-sm">
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
