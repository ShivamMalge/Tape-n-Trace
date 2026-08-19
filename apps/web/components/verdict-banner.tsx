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
    <div
      role="status"
      style={{
        display: 'grid',
        gap: 4,
        padding: '10px 14px',
        borderRadius: 'var(--tnt-radius)',
        border: `1px solid ${verdict.color}`,
        background: verdict.background,
      }}
    >
      <strong style={{ color: verdict.color, fontSize: 15 }}>{verdict.headline}</strong>
      {verdict.detail === null ? null : (
        <span style={{ fontSize: 13 }}>{verdict.detail}</span>
      )}
      {meta.truncated === undefined ? null : (
        <span style={{ fontSize: 12 }} className="tnt-muted">
          {meta.truncated.reason}
        </span>
      )}
    </div>
  )
}

interface Verdict {
  headline: string
  detail: string | null
  color: string
  background: string
}

function describe(result: TraceResult): Verdict | null {
  switch (result.type) {
    case 'acceptance':
      return result.accepted
        ? {
            headline: 'Accepted',
            detail: result.note ?? null,
            color: 'var(--tnt-accepting)',
            background: 'var(--tnt-accepting-soft)',
          }
        : {
            headline: 'Rejected',
            detail: result.note ?? null,
            color: 'var(--tnt-marked)',
            background: 'var(--tnt-surface)',
          }

    case 'incomplete':
      return {
        headline: 'Stopped without a verdict',
        detail: `${result.reason} The run was cut short, so this is not a rejection — the string may well be in the language.`,
        color: 'var(--tnt-marked)',
        background: 'var(--tnt-surface)',
      }

    default:
      return null
  }
}
