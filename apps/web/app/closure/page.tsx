import type { Metadata } from 'next'
import { ClosureLab } from '../../components/closure-lab'

export const metadata: Metadata = {
  title: 'Closure lab',
  description: 'Union, intersection, complement, difference, reversal and homomorphisms, built step by step.',
}

export default function ClosurePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Closure lab</h1>
      <p className="tnt-prose">
        The regular languages are closed under all of these, and each closure result is a{' '}
        <em>construction</em> rather than a fact to memorise. Pick one and watch it get built.
      </p>
      <p className="tnt-prose tnt-muted tnt-sm">
        Hopcroft 2e §4.2. Union, intersection and difference share a single product walk and differ only
        in which pairs accept — worth noticing, since they are usually taught as three separate theorems.
      </p>
      <ClosureLab />
    </div>
  )
}
