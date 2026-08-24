'use client'

/**
 * The Turing-machine editor — δ typed one move per line, drawn with `X/Y →`
 * arc labels, validated as you type, and run in place.
 */

import { useMemo, useState } from 'react'
import { TM_PRESETS, isDeterministicTM, isOk, validateTM } from '@tape-n-trace/engine'
import type { TmPreset } from '@tape-n-trace/engine'
import { AutomatonRenderer } from '@tape-n-trace/ui'
import { ValidationErrors } from './validation-errors'
import { TmRunner } from './tm-runner'
import { parseTmText, tmToText } from '../lib/tm-text'
import { tmToDrawable } from '../lib/tm-drawable'
import { useDebounced } from '../lib/use-debounced'

const OPENING = TM_PRESETS[0] as TmPreset

export function TmEditor(): React.JSX.Element {
  const [source, setSource] = useState(tmToText(OPENING.machine))
  const [start, setStart] = useState(OPENING.machine.start)
  const [acceptingText, setAcceptingText] = useState(OPENING.machine.accepting.join(', '))
  const [blank, setBlank] = useState(OPENING.machine.blank)
  const [inputText, setInputText] = useState(OPENING.machine.inputAlphabet.join(', '))
  const settled = useDebounced(source, 250)

  const outcome = useMemo(() => {
    const parsed = parseTmText(settled, {
      start,
      accepting: acceptingText.split(','),
      blank,
      inputAlphabet: inputText.split(','),
    })
    if (!isOk(parsed)) return { machine: null, errors: parsed.errors }
    const problems = validateTM(parsed.value)
    return problems.length > 0 ? { machine: null, errors: problems } : { machine: parsed.value, errors: [] }
  }, [settled, start, acceptingText, blank, inputText])

  const machine = outcome.machine
  const loadPreset = (id: string): void => {
    const preset = TM_PRESETS.find((p) => p.id === id)
    if (preset === undefined) return
    setSource(tmToText(preset.machine))
    setStart(preset.machine.start)
    setAcceptingText(preset.machine.accepting.join(', '))
    setBlank(preset.machine.blank)
    setInputText(preset.machine.inputAlphabet.join(', '))
  }

  return (
    <div className="tnt-stack">
      <div className="tnt-row tnt-row-tight">
        <span className="tnt-muted tnt-sm">Start from:</span>
        {TM_PRESETS.filter((p) => p.encodeInput === undefined).map((p) => (
          <button key={p.id} type="button" onClick={() => loadPreset(p.id)} className="tnt-chip">
            {p.title}
          </button>
        ))}
      </div>

      <label className="tnt-field">
        <span className="tnt-muted">
          Moves — one per line, <code>state, read -&gt; state, write, move</code>, with L or R (S on a
          multitape machine only). For several tapes, separate the per-tape symbols with spaces.
        </span>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={Math.max(8, source.split('\n').length + 1)}
          spellCheck={false}
          className="tnt-input tnt-input-mono"
          style={{ resize: 'vertical' }}
        />
      </label>

      <div className="tnt-row tnt-row-end">
        <Field label="Start state" value={start} onChange={setStart} />
        <Field label="Accepting states" value={acceptingText} onChange={setAcceptingText} wide />
        <Field label="Blank symbol" value={blank} onChange={setBlank} />
        <Field label="Input symbols" value={inputText} onChange={setInputText} wide />
      </div>

      <ValidationErrors errors={outcome.errors} />

      {machine === null ? null : (
        <>
          <p role="status" className="tnt-muted tnt-sm" style={{ margin: 0 }}>
            {machine.states.length} states, {machine.tapes} tape{machine.tapes === 1 ? '' : 's'}, tape alphabet{' '}
            {`{${machine.tapeAlphabet.join(', ')}}`} —{' '}
            {isDeterministicTM(machine)
              ? 'deterministic.'
              : 'nondeterministic: some state and symbol have more than one move, so runs show a branch tree (§8.4.4).'}
          </p>
          <div className="tnt-card tnt-card-plain">
            <AutomatonRenderer machine={tmToDrawable(machine)} step={null} instanceId="tm-edit" />
          </div>
          <section aria-label="Run it">
            <h2>Run it</h2>
            <TmRunner machine={machine} />
          </section>
        </>
      )}
    </div>
  )
}

function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }): React.JSX.Element {
  return (
    <label className="tnt-field">
      <span className="tnt-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="tnt-input tnt-input-mono"
        style={{ minWidth: wide ? 200 : 90 }}
      />
    </label>
  )
}
