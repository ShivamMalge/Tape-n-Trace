import type { Metadata } from 'next'
import { CONVERSIONS } from '../../lib/conversions'

export const metadata: Metadata = {
  title: 'Conversions',
  description: 'Watch the constructions happen, one step at a time.',
}

export default function ConvertIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Conversions</h1>
      <p style={{ maxWidth: '62ch' }}>
        The heart of the exam. Each of these is a mechanical procedure whose intermediate working a
        textbook prints only as a finished answer — here you can step through it and read what each
        step did.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Finite automata and regular expressions</h2>
      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, marginTop: 12 }}>
        {CONVERSIONS.map((conversion) => (
          <li key={conversion.id}>
            <a
              href={`/convert/${conversion.id}`}
              className="tnt-card"
              style={{ display: 'grid', gap: 4, textDecoration: 'none', color: 'inherit' }}
            >
              <strong style={{ fontSize: 16 }}>
                {conversion.title}
                {conversion.enrichment === true ? (
                  <span
                    className="tnt-muted"
                    style={{ fontSize: 11, marginLeft: 8, fontWeight: 400, textTransform: 'uppercase' }}
                  >
                    beyond the syllabus
                  </span>
                ) : null}
              </strong>
              <span style={{ fontSize: 14 }}>{conversion.summary}</span>
              <span className="tnt-muted" style={{ fontSize: 12 }}>
                {conversion.citation}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Pushdown automata</h2>
      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, marginTop: 12 }}>
        {[
          {
            href: '/convert/pda-acceptance',
            title: 'Final state ↔ empty stack',
            summary:
              'The two PDA acceptance modes, interconverted — the bottom marker, the drain state and the detecting ε-moves, one step at a time.',
            citation: 'Hopcroft 2e, §6.2.3–6.2.4 (Thms 6.9 and 6.11)',
          },
          {
            href: '/convert/cfg-to-pda',
            title: 'Grammar → PDA',
            summary:
              'The one-state construction: productions become expansion moves, terminals become match moves, and the stack holds the leftmost derivation.',
            citation: 'Hopcroft 2e, §6.3.1 (Thm 6.13)',
          },
        ].map((entry) => (
          <li key={entry.href}>
            <a
              href={entry.href}
              className="tnt-card"
              style={{ display: 'grid', gap: 4, textDecoration: 'none', color: 'inherit' }}
            >
              <strong style={{ fontSize: 16 }}>{entry.title}</strong>
              <span style={{ fontSize: 14 }}>{entry.summary}</span>
              <span className="tnt-muted" style={{ fontSize: 12 }}>
                {entry.citation}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
