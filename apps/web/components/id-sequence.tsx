'use client'

/**
 * The ID sequence card — design artboard 02: a mono label, a Copy button, and
 * the IDs joined by ⊢ with the ID of the current step in full ink and the
 * rest dimmed. Copy puts the whole sequence on the clipboard in exactly the
 * notation an answer sheet wants (§8.2.3 for TMs, §6.1.3 for PDAs).
 */

import { useState } from 'react'

export function IdSequence({
  ids,
  current,
  label = 'ID sequence',
  note,
}: {
  /** One ID per step, in order. */
  ids: readonly string[]
  /** The index of the step being shown; that ID is set in full ink. */
  current: number
  label?: string
  /** One short line under the IDs — what the notation means. */
  note?: string | undefined
}): React.JSX.Element | null {
  const text = ids.join(' ⊢ ')
  /**
   * What was put on the clipboard, not whether anything was. A boolean stuck on
   * "Copied" through the next run would claim the clipboard held a sequence no
   * longer on screen. Comparing against the current text makes the label true
   * by construction.
   */
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const copied = copiedText !== null && copiedText === text

  if (ids.length === 0) return null

  return (
    <section className="tnt-card tnt-idseq" aria-label={label}>
      <div className="tnt-card-head">
        <h2 className="tnt-label">{label}</h2>
        <button
          type="button"
          className="tnt-btn tnt-btn-copy"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(text)
              .then(() => setCopiedText(text))
              .catch(() => setCopiedText(null))
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="tnt-idseq-ids">
        {ids.map((id, i) => (
          <span key={i} data-current={i === current ? 'true' : undefined}>
            {id}
            {i < ids.length - 1 ? ' ⊢ ' : ''}
          </span>
        ))}
      </div>
      {note === undefined ? null : <p className="tnt-meta tnt-idseq-note">{note}</p>}
    </section>
  )
}
