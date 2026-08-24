import type { Metadata } from 'next'
import { PdaAcceptanceWorkbench } from '../../../components/pda-acceptance-workbench'

export const metadata: Metadata = {
  title: 'PDA acceptance modes',
  description:
    'Final state to empty stack and back — watch the new start state, the bottom marker and the ε-moves arrive.',
}

export default function PdaAcceptancePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Final state ↔ empty stack</h1>
      <p className="tnt-prose">
        Hopcroft 2e §6.2.3–6.2.4. A PDA can accept by reaching a final state or by draining its
        stack, and the two are interconvertible. Both constructions turn on one new stack symbol,
        pushed <em>underneath</em> everything: going one way it is the tripwire that reveals the
        original stack just emptied, going the other it is the safety net that stops an accidental
        acceptance.
      </p>
      <PdaAcceptanceWorkbench />
    </div>
  )
}
