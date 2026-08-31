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
      <div className="tnt-page-head">
        <div>
          <h1>PDA Simulator</h1>
          <p className="tnt-prose tnt-lead">
            Hopcroft 2e §6.1–6.2. A PDA is a finite automaton plus a stack, and its whole truth at any moment is the
            instantaneous description (q, w, γ). This page runs the ID relation ⊢ in front of you: three synced
            panels, the branch tree for every guess, and the ID sequence in the notation your answer sheet wants.
          </p>
        </div>
        <p className="tnt-page-links">
          Build your own in <a href="/edit/pda">the PDA editor</a>, or watch{' '}
          <a href="/convert/pda-acceptance">final state ↔ empty stack</a> and{' '}
          <a href="/convert/cfg-to-pda">grammar → PDA</a>.
        </p>
      </div>
      <PdaWorkbench />
    </div>
  )
}
