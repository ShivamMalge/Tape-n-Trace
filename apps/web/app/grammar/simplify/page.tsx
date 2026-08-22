import type { Metadata } from 'next'
import { SimplifyPipeline } from '../../../components/simplify-pipeline'

export const metadata: Metadata = {
  title: 'Simplification and CNF',
  description:
    'ε-productions, unit productions, useless symbols and Chomsky Normal Form — four steppers chained in the safe order, with the grammar diffed at each stage.',
}

export default function SimplifyPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Simplification and Chomsky Normal Form</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §7.1. Four constructions that must run in one particular order — ε-productions,
        unit productions, useless symbols, then CNF — because each can leave behind what an earlier one
        removed if they run the other way. Type a grammar, watch each stage work, and see the grammar
        diffed between stages.
      </p>
      <SimplifyPipeline />
    </div>
  )
}
