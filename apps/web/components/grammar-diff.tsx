'use client'

/**
 * Grammar diffs and symbol chips for the simplification pipeline.
 */

import { productionToText } from '@tape-n-trace/engine'
import type { CFG } from '@tape-n-trace/engine'

const key = (head: string, body: readonly string[]): string => `${head} → ${body.join(' ')}`

export function SymbolChips({ label, symbols }: { label: string; symbols: readonly string[] }): React.JSX.Element {
  return (
    <div className="tnt-row tnt-row-tight">
      <span className="tnt-meta">
        {label}:
      </span>
      {symbols.length === 0 ? (
        <span className="tnt-meta">
          none yet
        </span>
      ) : (
        symbols.map((s) => (
          <span
            key={s}
            className="tnt-tag tnt-mono"
            style={{ background: 'var(--tnt-current-soft)', color: 'var(--tnt-text)' }}
          >
            {s}
          </span>
        ))
      )}
    </div>
  )
}

/** Before and after, with what was removed struck through and what was added marked. */
export function GrammarDiff({ before, after }: { before: CFG; after: CFG }): React.JSX.Element {
  const beforeKeys = new Set(before.productions.map((p) => key(p.head, p.body)))
  const afterKeys = new Set(after.productions.map((p) => key(p.head, p.body)))
  const removed = before.productions.filter((p) => !afterKeys.has(key(p.head, p.body))).length
  const added = after.productions.filter((p) => !beforeKeys.has(key(p.head, p.body))).length

  return (
    <div aria-label="Before and after" className="tnt-panels tnt-panels-narrow">
      <div className="tnt-card tnt-card-plain">
        <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-2)' }}>
          Before — {removed === 0 ? 'nothing removed' : `${removed} removed`}
        </div>
        <ol className="tnt-mono tnt-sm tnt-stack-sm" style={{ margin: 0, paddingLeft: 'var(--tnt-space-5)' }}>
          {before.productions.map((p, i) => {
            const gone = !afterKeys.has(key(p.head, p.body))
            return (
              <li key={i} data-removed={gone ? 'true' : undefined} style={gone ? { textDecoration: 'line-through', color: 'var(--tnt-dead)' } : undefined}>
                {productionToText(p)}
              </li>
            )
          })}
        </ol>
      </div>
      <div className="tnt-card tnt-card-plain">
        <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-2)' }}>
          After — {added === 0 ? 'nothing added' : `${added} added`}
        </div>
        <ol className="tnt-mono tnt-sm tnt-stack-sm" style={{ margin: 0, paddingLeft: 'var(--tnt-space-5)' }}>
          {after.productions.map((p, i) => {
            const fresh = !beforeKeys.has(key(p.head, p.body))
            return (
              <li key={i} data-added={fresh ? 'true' : undefined} style={fresh ? { background: 'var(--tnt-accepting-soft)', borderRadius: 'var(--tnt-radius-sm)' } : undefined}>
                {productionToText(p)}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
