import type { Metadata } from 'next'
import { GALLERY } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'Simulate a finite automaton',
}

export default function SimulateIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Simulate a finite automaton</h1>
      <p className="tnt-prose">
        Pick a machine, give it a string, and step through the run. Every step says what it did and cites
        the section of the textbook it came from.
      </p>

      <ul className="tnt-stack" style={{ listStyle: 'none', padding: 0, marginTop: 'var(--tnt-space-5)' }}>
        {GALLERY.map((entry) => (
          <li key={entry.id}>
            <a href={`/simulate/${entry.id}`} className="tnt-card tnt-stack-sm">
              <strong>{entry.title}</strong>
              <span className="tnt-sm">{entry.language}</span>
              <span className="tnt-meta">
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
