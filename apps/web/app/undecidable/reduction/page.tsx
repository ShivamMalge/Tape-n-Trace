import type { Metadata } from 'next'
import { ReductionBuilder } from '../../../components/reduction-builder'

export const metadata: Metadata = {
  title: 'The reduction builder',
  description:
    'Build A ≤ B as Fig. 8.7 draws it, with the construction and the contradiction laid out — and the wrong direction refused.',
}

export default function ReductionPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>The reduction builder</h1>
      <p style={{ maxWidth: '70ch' }}>
        Hopcroft 2e §8.1.3. Once one problem is known to have no algorithm, every later proof can borrow from it. Take an
        instance of the hard problem, build from it an instance of the new problem with the same answer, and an algorithm
        for the new problem would have solved the hard one. Since nothing solves the hard one, nothing solves the new
        one either.
      </p>
      <p style={{ maxWidth: '70ch' }}>
        The direction is the part students lose marks on, so it is enforced here rather than explained. A reduction must
        run <em>from</em> a problem already known to be undecidable <em>to</em> the new one. Turn it around and the
        statement you prove is &ldquo;if the new problem is decidable, then the hard one is&rdquo; — true, and useless,
        because its conclusion is already known to be false. Pick a decidable problem as the source and this page will
        say so instead of drawing a diagram.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '70ch', fontSize: 14 }}>
        Which source you start from also decides what you have proved (§9.2.4, p. 380). A reduction from L<sub>u</sub>{' '}
        shows a problem is not recursive and says nothing about whether it is RE. Only a reduction from L<sub>d</sub>{' '}
        can show a problem is not RE at all — and L<sub>u</sub>, being RE itself, is no use for that.
      </p>

      <div style={{ marginTop: 20 }}>
        <ReductionBuilder />
      </div>
    </div>
  )
}
