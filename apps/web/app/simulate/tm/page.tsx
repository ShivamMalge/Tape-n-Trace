import type { Metadata } from 'next'
import { TmWorkbench } from '../../../components/tm-workbench'

export const metadata: Metadata = {
  title: 'Simulate a Turing machine',
  description:
    'Run the chapter 8 machines: the tape scrolls or the head walks, the ID sequence is written out, and a machine that does not halt says so.',
}

export default function TmSimulatePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Simulate a Turing machine</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §8.2–8.4. A finite control, one infinite tape, a head that reads, writes and
        moves — and everything a computer can do. Each machine here is the book’s own, run with the
        ID sequence written in §8.2.3’s notation beside the tape.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '64ch', fontSize: 14 }}>
        Build your own in <a href="/edit/tm">the editor</a>, or watch{' '}
        <a href="/convert/tm-multitape">many tapes reduced to one</a>.
      </p>
      <TmWorkbench />
    </div>
  )
}
