import type { Metadata } from 'next'
import { GALLERY } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'Simulate a finite automaton',
}

/** The gallery as a card grid — the catalog's shape (artboard 01), one machine per card. */
export default function SimulateIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <div className="tnt-page-head">
        <div>
          <h1>DFA / NFA Simulator</h1>
          <p className="tnt-prose tnt-lead">
            Pick a machine, give it a string, and step through the run. Every step says what it did and cites the
            section of the textbook it came from.
          </p>
        </div>
        <p className="tnt-page-links">
          Or <a href="/edit">draw your own</a> and run it there.
        </p>
      </div>

      <ul className="tnt-catalog tnt-catalog-list" aria-label="Machines">
        {GALLERY.map((entry) => (
          <li key={entry.id}>
            <a href={`/simulate/${entry.id}`} className="tnt-card tnt-tool-card">
              <span className="tnt-tool-card-head">
                <span className={`tnt-verb${entry.machine.kind === 'ENFA' ? ' tnt-verb-keep' : ''}`} data-verb="simulate">
                  {entry.machine.kind === 'ENFA' ? 'ε-NFA' : entry.machine.kind}
                </span>
                <span className="tnt-tool-card-mod">{entry.citation}</span>
              </span>
              <span className="tnt-tool-card-title">{entry.title}</span>
              <span className="tnt-tool-card-sum tnt-mono">{entry.language}</span>
              <span className="tnt-meta">
                {entry.machine.states.length} states over {`{${entry.machine.alphabet.join(', ')}}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
