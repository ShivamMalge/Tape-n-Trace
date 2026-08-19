import type { Metadata } from 'next'
import { GALLERY } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'Simulate a finite automaton',
}

export default function SimulateIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Simulate a finite automaton</h1>
      <p style={{ maxWidth: '62ch' }}>
        Pick a machine, give it a string, and step through the run. Every step says what it did and cites
        the section of the textbook it came from.
      </p>

      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, marginTop: 24 }}>
        {GALLERY.map((entry) => (
          <li key={entry.id}>
            <a
              href={`/simulate/${entry.id}`}
              className="tnt-card"
              style={{ display: 'grid', gap: 4, textDecoration: 'none', color: 'inherit' }}
            >
              <strong style={{ fontSize: 16 }}>{entry.title}</strong>
              <span style={{ fontSize: 14 }}>{entry.language}</span>
              <span className="tnt-muted" style={{ fontSize: 12 }}>
                {entry.citation} · {entry.machine.states.length} states over{' '}
                {`{${entry.machine.alphabet.join(', ')}}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
