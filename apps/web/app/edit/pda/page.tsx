import type { Metadata } from 'next'
import { PdaEditor } from '../../../components/pda-editor'

export const metadata: Metadata = {
  title: 'Draw a PDA',
  description:
    'Write a pushdown automaton transition by transition, see it drawn with a, X/YX labels, and check whether it is deterministic.',
}

export default function PdaEditPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Build a pushdown automaton</h1>
      <p className="tnt-prose">
        Hopcroft 2e §6.1 and §6.4. Type δ the way the book writes it — one move per line — and the
        graph, the validation list and the DPDA check follow as you type. The determinism report
        names the exact pairs of moves that can fire on the same ID, which is the thing an exam
        answer about DPDAs has to point at.
      </p>
      <PdaEditor />
    </div>
  )
}
