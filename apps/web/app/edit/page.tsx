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
      <h1>Draw a machine</h1>
      <p className="tnt-prose" style={{ marginTop: 0 }}>
        Start from nothing, or open a preset and change it. Everything wrong with the machine is listed
        underneath while you work, rather than one problem at a time.
      </p>

      <MachineEditor />

      <section className="tnt-section">
        <h2>Start from a preset instead</h2>
        <ul className="tnt-row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {GALLERY.map((entry) => (
            <li key={entry.id}>
              <a href={`/edit/${entry.id}`} className="tnt-chip">
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
