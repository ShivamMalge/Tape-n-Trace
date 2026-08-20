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

      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, marginTop: 24 }}>
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
    </div>
  )
}
