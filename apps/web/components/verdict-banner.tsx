'use client'

/**
 * The verdict a run reached — design artboard 00, "three states, never two".
 *
 * A run stopped by a size guard is reported as stopped — never as a rejection —
 * because "we did not find acceptance within the cap" is not "this string is
 * not in the language" (§2.6, §9). Presenting the first as the second is
 * exactly the silent cap §9 calls a defect. Accepted is green, Rejected red,
 * Stopped amber, and each carries its reason in prose beside the headline.
 */

import type { TraceMeta, TraceResult } from '@tape-n-trace/engine'

export function VerdictBanner({
  result,
  meta,
  action,
}: {
  result: TraceResult
  meta: TraceMeta
  /** An offer that belongs to the verdict — "Continue for 1000 more moves". */
  action?: React.ReactNode
}): React.JSX.Element | null {
  const verdict = describe(result)
  if (verdict === null) return null

  return (
    <div role="status" className={`tnt-banner ${verdict.variant}`}>
      <span className="tnt-banner-headline">{verdict.headline}</span>
      <span className="tnt-banner-detail">
        {verdict.detail}
        {meta.truncated === undefined ? null : <> {meta.truncated.reason}</>}
      </span>
      {action}
    </div>
  )
}

interface Verdict {
  headline: string
  detail: string | null
  /** The `.tnt-banner` variant that tints the field and the rule. */
  variant: string
}

function describe(result: TraceResult): Verdict | null {
  switch (result.type) {
    case 'acceptance':
      return result.accepted
        ? { headline: 'Accepted', detail: result.note ?? null, variant: 'tnt-banner-good' }
        : { headline: 'Rejected', detail: result.note ?? null, variant: 'tnt-banner-bad' }

    case 'incomplete':
      return {
        headline: 'Stopped',
        detail: `${result.reason} No verdict yet — this is not a rejection; the string may well be in the language.`,
        variant: 'tnt-banner-warn',
      }

    default:
      return null
  }
}
