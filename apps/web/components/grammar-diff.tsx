'use client'

/**
 * Grammar diffs and symbol chips for the simplification pipeline.
 */

import { productionToText } from '@tape-n-trace/engine'
import type { CFG } from '@tape-n-trace/engine'

const key = (head: string, body: readonly string[]): string => `${head} → ${body.join(' ')}`

export function SymbolChips({ label, symbols }: { label: string; symbols: readonly string[] }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="tnt-muted" style={{ fontSize: 12 }}>
        {label}:
      </span>
      {symbols.length === 0 ? (
        <span className="tnt-muted" style={{ fontSize: 12 }}>
          none yet
        </span>
      ) : (
        symbols.map((s) => (
          <span
            key={s}
            style={{
              fontFamily: 'var(--tnt-mono)',
              fontSize: 13,
              padding: '1px 8px',
              borderRadius: 999,
              border: '1px solid var(--tnt-border)',
              background: 'var(--tnt-current-soft)',
            }}
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
    <div aria-label="Before and after" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        <div className="tnt-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Before — {removed === 0 ? 'nothing removed' : `${removed} removed`}
        </div>
        <ol style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--tnt-mono)', fontSize: 13, display: 'grid', gap: 2 }}>
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
      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        <div className="tnt-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          After — {added === 0 ? 'nothing added' : `${added} added`}
        </div>
        <ol style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--tnt-mono)', fontSize: 13, display: 'grid', gap: 2 }}>
          {after.productions.map((p, i) => {
            const fresh = !beforeKeys.has(key(p.head, p.body))
            return (
              <li key={i} data-added={fresh ? 'true' : undefined} style={fresh ? { background: 'var(--tnt-accepting-soft)', borderRadius: 3 } : undefined}>
                {productionToText(p)}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
