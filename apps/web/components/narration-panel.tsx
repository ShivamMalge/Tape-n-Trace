'use client'

/**
 * The explanation panel.
 *
 * Narration is rendered **verbatim** — the engine wrote one sentence of exam
 * language per step (§5), and rewording it here would put two different
 * explanations of the same step into the product.
 *
 * The live region matters: a student stepping through with the keyboard hears
 * each step announced without having to hunt for where the text changed.
 */

import type { Step } from '@tape-n-trace/engine'

export function NarrationPanel({ step }: { step: Step | null }): React.JSX.Element {
  return (
    <section
      className="tnt-card"
      aria-live="polite"
      aria-atomic="true"
      style={{ minHeight: 74, display: 'grid', gap: 6, alignContent: 'start' }}
    >
      <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }} className="tnt-muted">
        What just happened
      </h2>

      {step === null ? (
        <p className="tnt-muted" style={{ margin: 0 }}>
          Enter a string and press Run to step through the machine.
        </p>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 15 }}>{step.narration}</p>
          {step.citation === undefined ? null : (
            <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
              Hopcroft 2e, §{step.citation}
            </p>
          )}
        </>
      )}
    </section>
  )
}
