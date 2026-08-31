import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TmWorkbench } from '../../../components/tm-workbench'

export const metadata: Metadata = {
  title: 'Simulate a Turing machine',
  description:
    'Run the chapter 8 machines: the tape scrolls or the head walks, the ID sequence is written out, and a machine that does not halt says so.',
}

export default function TmSimulatePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <div className="tnt-page-head">
        <div>
          <h1>Turing Machine Simulator</h1>
          <p className="tnt-prose tnt-lead">
            Hopcroft 2e §8.2–8.4. A finite control, one infinite tape, a head that reads, writes and moves — and
            everything a computer can do. Each machine here is the book’s own, run with the ID sequence written in
            §8.2.3’s notation beside the tape.
          </p>
        </div>
        <p className="tnt-page-links">
          Build your own in <a href="/edit/tm">the editor</a>, or watch{' '}
          <a href="/convert/tm-multitape">many tapes reduced to one</a>.
        </p>
      </div>
      {/* useSearchParams inside needs a boundary for the static prerender. */}
      <Suspense fallback={null}>
        <TmWorkbench />
      </Suspense>
    </div>
  )
}
