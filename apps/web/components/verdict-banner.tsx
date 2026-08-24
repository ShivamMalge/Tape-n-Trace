'use client'

/**
 * The verdict a run reached.
 *
 * Three outcomes, not two. A run stopped by a size guard is reported as stopped
 * — never as a rejection — because "we did not find acceptance within the cap"
 * is not "this string is not in the language" (§2.6, §9). Presenting the first
 * as the second is exactly the silent cap §9 calls a defect.
 */

import type { TraceMeta, TraceResult } from '@tape-n-trace/engine'

export function VerdictBanner({
  result,
  meta,
}: {
  result: TraceResult
  meta: TraceMeta
}): React.JSX.Element | null {
  const verdict = describe(result)
  if (verdict === null) return null

  return (
    <div role="status" className={`tnt-note ${verdict.variant} tnt-stack-sm`}>
      <strong style={{ color: verdict.color }}>{verdict.headline}</strong>
      {verdict.detail === null ? null : <span>{verdict.detail}</span>}
      {meta.truncated === undefined ? null : (
        <span className="tnt-meta">{meta.truncated.reason}</span>
      )}
    </div>
  )
}

interface Verdict {
  headline: string
  detail: string | null
  /** The verdict colour, applied to the headline. Semantic, so it stays inline. */
  color: string
  /** The `.tnt-note` variant that colours the rule down the left edge. */
  variant: string
}

function describe(result: TraceResult): Verdict | null {
  switch (result.type) {
    case 'acceptance':
      return result.accepted
        ? {
            headline: 'Accepted',
            detail: result.note ?? null,
            color: 'var(--tnt-accepting)',
            variant: 'tnt-note-good',
          }
        : {
            headline: 'Rejected',
            detail: result.note ?? null,
            color: 'var(--tnt-marked)',
            variant: 'tnt-note-warn',
          }

    case 'incomplete':
      return {
        headline: 'Stopped without a verdict',
        detail: `${result.reason} The run was cut short, so this is not a rejection — the string may well be in the language.`,
        color: 'var(--tnt-marked)',
        variant: 'tnt-note-warn',
      }

    default:
      return null
  }
}
