import type { Metadata } from 'next'
import { CfgToPdaWorkbench } from '../../../components/cfg-to-pda-workbench'

export const metadata: Metadata = {
  title: 'Grammar → PDA',
  description:
    'The one-state construction of Theorem 6.13: every production becomes an expansion move, every terminal a match move.',
}

export default function CfgToPdaPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Grammar → PDA</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §6.3.1, Thm 6.13. Grammars and pushdown automata define the same languages, and
        this construction is the easy half: one state, the start symbol on the stack, and the stack
        thereafter holds exactly the unmatched tail of a leftmost derivation. Run the machine it
        builds and watch the derivation happen on the stack.
      </p>
      <CfgToPdaWorkbench />
    </div>
  )
}
