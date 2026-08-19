import type { Metadata } from 'next'
import { GALLERY } from '@tape-n-trace/engine'
import { MachineEditor } from '../../components/machine-editor'

export const metadata: Metadata = {
  title: 'Draw a machine',
  description: 'Draw a DFA, NFA or ε-NFA, and see every problem with it as you go.',
}

export default function EditPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Draw a machine</h1>
      <p style={{ maxWidth: '62ch', marginTop: 0 }}>
        Start from nothing, or open a preset and change it. Everything wrong with the machine is listed
        underneath while you work, rather than one problem at a time.
      </p>

      <MachineEditor />

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 17 }}>Start from a preset instead</h2>
        <ul style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: 0 }}>
          {GALLERY.map((entry) => (
            <li key={entry.id}>
              <a
                href={`/edit/${entry.id}`}
                style={{
                  display: 'inline-block',
                  fontSize: 13,
                  padding: '4px 11px',
                  borderRadius: 999,
                  border: '1px solid var(--tnt-border)',
                  textDecoration: 'none',
                }}
              >
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
