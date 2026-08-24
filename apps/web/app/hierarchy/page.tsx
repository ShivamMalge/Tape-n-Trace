import type { Metadata } from 'next'
import { LANGUAGE_CLASSES } from '@tape-n-trace/engine'
import { HierarchyRings } from '../../components/hierarchy-rings'

export const metadata: Metadata = {
  title: 'The hierarchy',
  description:
    'Nested rings from the regular languages out to every language, each with its machine, grammar, closure properties and pumping lemma, and the languages that separate them.',
}

export default function HierarchyPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>The hierarchy of language classes</h1>
      <p className="tnt-prose">
        The whole course, on one picture. Each ring is a class of languages and a kind of machine, and each contains the
        one inside it — every regular language is context-free, every context-free language is recursive, and so on
        outwards. What makes it a course rather than a diagram is that every containment is <em>proper</em>, and the
        proof of each is a separate technique: the pumping lemma of §4.1 pushes a language out of the innermost ring,
        the pumping lemma of §7.2 pushes it out of the next, and diagonalization pushes L<sub>d</sub> out of them all.
      </p>
      <p className="tnt-prose tnt-muted tnt-sm">
        Open a ring for its machine, its grammar, what it is closed under, its pumping lemma and what can be decided
        about it. The languages plotted in each ring link to the page that proves they belong there.
      </p>

      <div style={{ marginTop: 'var(--tnt-space-5)' }}>
        <HierarchyRings
          show={LANGUAGE_CLASSES.map((c) => c.id)}
          caption="Each language sits in the innermost class that contains it, so a language shown in the context-free ring is context-free and not regular. The outermost region is Fig. 9.2's “not RE”."
        />
      </div>

      <section className="tnt-section">
        <h2>How to place a language you have been given</h2>
        <ol className="tnt-prose tnt-sm tnt-stack-sm" style={{ paddingLeft: 20 }}>
          <li>
            Try to build a finite automaton or a regular expression. If one works, it is regular and you are finished —{' '}
            <a href="/edit">draw it</a>.
          </li>
          <li>
            If it will not, try the pumping lemma for regular languages: pick the adversary&rsquo;s side and see whether
            every split can be broken. <a href="/prove/pumping">Play it out</a>.
          </li>
          <li>
            Try a context-free grammar or a pushdown automaton. One counter&rsquo;s worth of memory is what a stack buys
            you, so 0ⁿ1ⁿ works and aⁿbⁿcⁿ does not. <a href="/grammar">Write the grammar</a> or{' '}
            <a href="/simulate/pda">run the PDA</a>.
          </li>
          <li>
            If that fails, use the pumping lemma for context-free languages — the one that splits a string five ways
            (§7.2.2). <a href="/prove/pumping">Same game, CFL variant</a>.
          </li>
          <li>
            Beyond that, the question is whether a Turing machine can decide it, merely accept it, or neither. That is{' '}
            <a href="/undecidable">Chapter 9</a>, and the answers come from reductions rather than from constructions.
          </li>
        </ol>
      </section>
    </div>
  )
}
