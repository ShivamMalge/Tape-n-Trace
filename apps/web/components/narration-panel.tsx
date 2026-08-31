'use client'

/**
 * The narration card — design artboard 02: a mono NARRATION label, the current
 * state set right in mono, and one sentence of exam language in Spectral.
 *
 * Narration is rendered **verbatim** — the engine wrote one sentence per step
 * (§5), and rewording it here would put two different explanations of the
 * same step into the product.
 *
 * The live region matters: a student stepping through with the keyboard hears
 * each step announced without having to hunt for where the text changed.
 */

import type { Step } from '@tape-n-trace/engine'

export function NarrationPanel({
  step,
  label,
  empty = 'Enter a string and press Run to step through the machine.',
}: {
  step: Step | null
  /** Set right of the heading — the current state, a subset, a round number. */
  label?: string | undefined
  empty?: string
}): React.JSX.Element {
  return (
    <section className="tnt-card tnt-narration" aria-live="polite" aria-atomic="true">
      <div className="tnt-card-head">
        <h2 className="tnt-label">Narration</h2>
        {label === undefined ? null : <span className="tnt-meta">{label}</span>}
      </div>

      {step === null ? (
        <p className="tnt-narration-text tnt-muted">{empty}</p>
      ) : (
        <>
          <p className="tnt-narration-text">{step.narration}</p>
          {step.citation === undefined ? null : <p className="tnt-meta">Hopcroft 2e, §{step.citation}</p>}
        </>
      )}
    </section>
  )
}
