import type { Metadata } from 'next'
import { DiagonalWorkbench } from '../../../components/diagonal-workbench'

export const metadata: Metadata = {
  title: 'The diagonalization table',
  description:
    'Fig. 9.1 with every cell computed: binary strings read as Turing machines, run under a step budget, and a diagonal you can complement.',
}

export default function DiagonalizationPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>The diagonalization table</h1>
      <p className="tnt-prose">
        Hopcroft 2e §9.1. Two numberings make this table possible. §9.1.1 pairs every binary string with an integer — put
        a 1 in front of w and read it as a number — so there is an <em>i</em>-th string w<sub>i</sub>. §9.1.2 writes
        every Turing machine as a binary string, and §9.1.3 reads a string that is not a well-formed code as the machine
        with one state and no moves. So every string is a machine, there is an <em>i</em>-th machine M<sub>i</sub>, and
        the grid below exists.
      </p>
      <p className="tnt-prose">
        Complement the diagonal and you have a language that disagrees with every row in that row&rsquo;s own column. It
        is therefore no row at all — and every Turing machine is a row. That is Theorem 9.2: L<sub>d</sub> is not
        recursively enumerable, which is stronger than saying it is undecidable.
      </p>
      <p className="tnt-prose tnt-muted tnt-sm">
        Every cell here is computed, not illustrated, and that changes what the table looks like. The book&rsquo;s own
        footnote to Fig. 9.1 warns that &ldquo;the top rows of the table are in fact solid 0&rsquo;s&rdquo;, because the
        low integers are all too short to be codes. They are, and you can see exactly where that stops.
      </p>

      <div style={{ marginTop: 'var(--tnt-space-5)' }}>
        <DiagonalWorkbench />
      </div>
    </div>
  )
}
