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
    <section aria-label="Result sample" className="tnt-card tnt-stack-sm">
      <strong>The shortest strings the result generates</strong>
      <p className="tnt-mono tnt-sm" style={{ margin: 0 }}>
        {shortest(grammar).map((w) => (w === '' ? 'ε' : w)).join('  ') || '—'}
      </p>
      <p className="tnt-meta" style={{ margin: 0 }}>
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
    <section aria-label="Agreement" className="tnt-card tnt-scroll-x">
      <strong>P′ against what the theorem says it should accept</strong>
      <table className="tnt-table tnt-mono" style={{ marginTop: 'var(--tnt-space-2)' }}>
        <thead>
          <tr>
            {['w', op === 'intersection' ? 'P · R' : 'P on h(w)', 'P′'].map((h) => (
              <th key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.w || 'ε'}>
              <td>{row.w === '' ? 'ε' : row.w}</td>
              <td>{row.left}</td>
              <td>{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
