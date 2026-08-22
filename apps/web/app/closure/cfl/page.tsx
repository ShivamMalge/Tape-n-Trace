import type { Metadata } from 'next'
import { CflClosureLab } from '../../../components/cfl-closure-lab'

export const metadata: Metadata = {
  title: 'CFL closure lab',
  description:
    'Union, concatenation, closure, reversal, substitution, intersection with a regular language and inverse homomorphism — and the intersection that fails.',
}

export default function CflClosurePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>CFL closure lab</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §7.3. What the context-free languages are closed under, each built in front of you —
        and what they are not: two grammars whose intersection is aⁿbⁿcⁿ, with the pumping game that
        proves it. For the regular languages’ version, see <a href="/closure">the closure lab</a>.
      </p>
      <CflClosureLab />
    </div>
  )
}
