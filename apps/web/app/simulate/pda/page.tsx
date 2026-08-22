import type { Metadata } from 'next'
import { PdaWorkbench } from '../../../components/pda-workbench'

export const metadata: Metadata = {
  title: 'Simulate a PDA',
  description:
    'Run a pushdown automaton and watch state, input and stack move together, with the ID sequence written out.',
}

export default function PdaSimulatePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Simulate a pushdown automaton</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §6.1–6.2. A PDA is a finite automaton plus a stack, and its whole truth at any
        moment is the instantaneous description (q, w, γ). This page runs the ID relation ⊢ in front
        of you: three synced panels, the branch tree for every guess, and the ID sequence in the
        notation your answer sheet wants.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '64ch', fontSize: 14 }}>
        Build your own machine in <a href="/edit/pda">the PDA editor</a>, or watch the conversions:{' '}
        <a href="/convert/pda-acceptance">final state ↔ empty stack</a> and{' '}
        <a href="/convert/cfg-to-pda">grammar → PDA</a>.
      </p>
      <PdaWorkbench />
    </div>
  )
}
