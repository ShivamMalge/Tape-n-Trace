'use client'

/**
 * The closure lab's result panels: the shortest strings a built grammar
 * generates, and a built PDA checked against what the theorem says it accepts.
 */

import { productionToText } from '@tape-n-trace/engine'
import type { CFG } from '@tape-n-trace/engine'
import { shortest, type Op } from '../lib/cfl-lab'

export function ResultSample({ grammar }: { grammar: CFG }): React.JSX.Element {
  return (
    <section aria-label="Result sample" className="tnt-card" style={{ display: 'grid', gap: 6 }}>
      <strong style={{ fontSize: 14 }}>The shortest strings the result generates</strong>
      <p style={{ margin: 0, fontFamily: 'var(--tnt-mono)', fontSize: 13 }}>
        {shortest(grammar).map((w) => (w === '' ? 'ε' : w)).join('  ') || '—'}
      </p>
      <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
        Productions: {grammar.productions.map((p) => productionToText(p)).join(' ; ')}
      </p>
    </section>
  )
}

export interface AgreementRow {
  w: string
  left: string
  right: string
}

export function AgreementTable({ rows, op }: { rows: readonly AgreementRow[]; op: Op }): React.JSX.Element {
  return (
    <section aria-label="Agreement" className="tnt-card" style={{ overflowX: 'auto' }}>
      <strong style={{ fontSize: 14 }}>P′ against what the theorem says it should accept</strong>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--tnt-mono)', marginTop: 6 }}>
        <thead>
          <tr>
            {['w', op === 'intersection' ? 'P · R' : 'P on h(w)', 'P′'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '3px 14px 3px 0', borderBottom: '1px solid var(--tnt-border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.w || 'ε'}>
              <td style={{ padding: '3px 14px 3px 0' }}>{row.w === '' ? 'ε' : row.w}</td>
              <td style={{ padding: '3px 14px 3px 0' }}>{row.left}</td>
              <td style={{ padding: '3px 14px 3px 0' }}>{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
