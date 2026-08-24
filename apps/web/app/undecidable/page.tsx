import type { Metadata } from 'next'
import { HierarchyRings } from '../../components/hierarchy-rings'
import { ClosureTable, ComplementPlacements } from '../../components/recursive-re-tables'

export const metadata: Metadata = {
  title: 'Undecidability',
  description:
    'Recursive inside recursively enumerable inside every language, where L_u and L_d sit on that picture, and what the two classes are closed under.',
}

export default function UndecidablePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Undecidability</h1>
      <p style={{ maxWidth: '68ch' }}>
        Hopcroft 2e §8.1 and §9.2. Everything else in this app runs something. This does not, and cannot: the results
        here are proofs that certain questions have no algorithm, and an animation of a machine deciding one would be a
        lie about the subject. What can be shown is the shape of the argument, and where each language ends up.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '68ch', fontSize: 14 }}>
        The two things you can work with are on their own pages:{' '}
        <a href="/undecidable/diagonalization">the diagonalization table</a>, whose every cell is a real machine run
        under a step budget, and <a href="/undecidable/reduction">the reduction builder</a>, which constructs A ≤ B and
        refuses when the direction is wrong.
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 19 }}>Where the languages live — Fig. 9.2</h2>
        <p style={{ maxWidth: '68ch', fontSize: 14 }}>
          A language is <strong>recursive</strong> when some Turing machine accepts it <em>and always halts</em>: on a
          string outside the language it stops and says so. A language is <strong>recursively enumerable</strong> when
          some Turing machine accepts it, with no promise about the strings outside — it may run for ever. §9.2.1 calls
          a problem <em>decidable</em> exactly when its language is recursive, and <em>undecidable</em> when it is not.
        </p>
        <HierarchyRings
          show={['recursive', 're', 'all']}
          caption="Fig. 9.2, with every language plotted in the innermost class that contains it. The full six-ring version, from the regular languages outwards, is on the hierarchy page."
        />
        <p style={{ maxWidth: '68ch', fontSize: 14, marginTop: 12 }}>
          <a href="/hierarchy">See the whole hierarchy →</a>
        </p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 19 }}>A language and its complement — §9.2.2</h2>
        <p style={{ maxWidth: '68ch', fontSize: 14 }}>
          Complementation is the tool that pins a language to a ring. Theorem 9.3 says a recursive language has a
          recursive complement — swap the accepting and halting behaviour, which is safe precisely because the machine
          always halts. Theorem 9.4 says that if a language <em>and</em> its complement are both RE, then running the
          two machines in parallel decides the language, so it is recursive. Between them, five of the nine possible
          placements disappear.
        </p>
        <ComplementPlacements />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 19 }}>What the two classes are closed under</h2>
        <p style={{ maxWidth: '68ch', fontSize: 14 }}>
          The pattern is worth naming before reading the table. The recursive languages are closed under the operations
          where a decision can be assembled from finitely many decisions, and complementation is the sharpest case. The
          RE languages give up complementation and gain homomorphism, because a machine that need never halt can search
          an unbounded space — and the recursive languages cannot afford to.
        </p>
        <ClosureTable />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 19 }}>What this page does not claim</h2>
        <ul style={{ maxWidth: '68ch', fontSize: 14, display: 'grid', gap: 6, paddingLeft: 20 }}>
          <li>
            Nothing here simulates an undecidable problem. The diagonalization table runs real machines under a stated
            move budget and reports a cell it could not fill as unanswered, which is the honest outcome and also the
            subject.
          </li>
          <li>
            No page decides membership in L<sub>u</sub>, the halting problem, or L<sub>d</sub>. There is no algorithm to
            implement, and Theorem 9.6 and Theorem 9.2 are why.
          </li>
          <li>
            The closure results other than complementation are the answers to Exercise 9.2.6, which the book sets without
            printing solutions. They are marked as exercise answers wherever they appear.
          </li>
        </ul>
      </section>
    </div>
  )
}
