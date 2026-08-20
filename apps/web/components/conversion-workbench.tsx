'use client'

/**
 * Picks the input for a conversion, then hands it to the stepper.
 *
 * Three pickers because there are three kinds of input, and one of them — the
 * regular expression — has to be parsed before it can be run. Parse errors are
 * shown against the expression with the offending character named, rather than
 * being deferred to a conversion that never starts.
 */

import { useMemo, useState } from 'react'
import { GALLERY, isErr, parseRegex } from '@tape-n-trace/engine'
import type { FiniteAutomaton } from '@tape-n-trace/engine'
import { ConversionStepper } from './conversion-stepper'
import { conversionById } from '../lib/conversions'
import type { ConversionInput } from '../lib/conversions'
import { SAMPLE_GRAMMARS, SAMPLE_REGEXES, grammarToText } from '../lib/sample-inputs'

/**
 * Takes the conversion's **id**, not the conversion.
 *
 * A registry entry carries its `run` function, and a function cannot cross the
 * server-to-client boundary — React refuses to serialise it. The registry is
 * plain module code importable from either side, so the client looks the entry
 * up itself and only the id travels as a prop.
 */
export function ConversionWorkbench({ conversionId }: { conversionId: string }): React.JSX.Element {
  const conversion = conversionById(conversionId)

  /**
   * Filtered by what the conversion accepts, then ordered by it.
   *
   * `accepts` is a preference list, not just a predicate: "NFA → DFA" accepts a
   * DFA perfectly well, but opening that page on one shows a conversion that
   * does nothing interesting. Listing 'NFA' first means the page opens on a
   * machine where the subset construction has something to say.
   */
  const machines = useMemo(() => {
    const accepts = conversion?.accepts
    const suitable = GALLERY.filter((entry) =>
      accepts === undefined ? true : accepts.includes(entry.machine.kind),
    )
    if (accepts === undefined) return suitable
    return [...suitable].sort(
      (a, b) => accepts.indexOf(a.machine.kind) - accepts.indexOf(b.machine.kind),
    )
  }, [conversion])

  const [machineId, setMachineId] = useState(machines[0]?.id ?? '')
  const [regex, setRegex] = useState(SAMPLE_REGEXES[0]?.source ?? '0')
  const [grammarId, setGrammarId] = useState(SAMPLE_GRAMMARS[0]?.id ?? '')

  const chosenMachine: FiniteAutomaton | undefined = machines.find((m) => m.id === machineId)?.machine
  const chosenGrammar = SAMPLE_GRAMMARS.find((g) => g.id === grammarId)

  const input: ConversionInput | null = useMemo(() => {
    switch (conversion?.takes) {
      case 'machine':
        return chosenMachine === undefined ? null : { kind: 'machine', machine: chosenMachine }
      case 'regex':
        return { kind: 'regex', source: regex }
      case 'grammar':
        return chosenGrammar === undefined ? null : { kind: 'grammar', grammar: chosenGrammar.grammar }
      default:
        return null
    }
  }, [conversion?.takes, chosenMachine, regex, chosenGrammar])

  const parseError = useMemo(() => {
    if (conversion?.takes !== 'regex') return null
    const parsed = parseRegex(regex)
    return isErr(parsed) ? (parsed.errors[0]?.message ?? 'That expression could not be parsed.') : null
  }, [conversion?.takes, regex])

  const picker = (
    <section className="tnt-card" style={{ display: 'grid', gap: 10 }}>
      {conversion?.takes === 'machine' ? (
        <Field label="Machine">
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)} style={select}>
            {machines.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {conversion?.takes === 'grammar' ? (
        <>
          <Field label="Grammar">
            <select value={grammarId} onChange={(e) => setGrammarId(e.target.value)} style={select}>
              {SAMPLE_GRAMMARS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </Field>
          {chosenGrammar === undefined ? null : (
            <pre
              style={{
                margin: 0,
                fontFamily: 'var(--tnt-mono)',
                fontSize: 13,
                background: 'var(--tnt-bg)',
                border: '1px solid var(--tnt-border)',
                borderRadius: 'var(--tnt-radius)',
                padding: '8px 10px',
              }}
            >
              {grammarToText(chosenGrammar.grammar)}
            </pre>
          )}
        </>
      ) : null}

      {conversion?.takes === 'regex' ? (
        <>
          <Field label="Regular expression">
            <input
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={parseError !== null}
              style={{ ...select, minWidth: 240, fontSize: 15 }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="tnt-muted" style={{ fontSize: 13 }}>
              Try:
            </span>
            {SAMPLE_REGEXES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => setRegex(sample.source)}
                title={sample.note}
                style={chip}
              >
                {sample.source}
              </button>
            ))}
          </div>

          <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
            Union is <code>+</code> or <code>|</code>; star is <code>*</code>. Write <code>ε</code> for the
            empty string and <code>∅</code> for the empty language. Star binds tightest, then
            concatenation, then union.
          </p>

          {parseError === null ? null : (
            <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--tnt-marked)' }}>
              {parseError}
            </p>
          )}
        </>
      ) : null}
    </section>
  )

  if (conversion === undefined) {
    return (
      <p className="tnt-muted" style={{ fontSize: 14 }}>
        No conversion is registered under that name.
      </p>
    )
  }

  if (input === null) {
    return (
      <p className="tnt-muted" style={{ fontSize: 14 }}>
        No source is available for this conversion yet.
      </p>
    )
  }

  // The picker already reports the parse error against the field, so the stepper
  // is held back rather than allowed to fail with the same message underneath —
  // one problem, reported once. Passed as a flag so the picker stays in the same
  // place in the tree and keeps focus while the expression is being corrected.
  return (
    <ConversionStepper
      conversion={conversion}
      input={input}
      picker={picker}
      disabled={parseError !== null}
    />
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, minWidth: 130 }} className="tnt-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

const select: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 14,
  padding: '6px 8px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
}

const chip: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 13,
  padding: '3px 9px',
  borderRadius: 999,
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  cursor: 'pointer',
}
