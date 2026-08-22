'use client'

/**
 * The two cards that say what the CFLs are *not* closed under and what no
 * page of this tool decides — Example 7.26, Theorems 7.18 and 7.29, and the
 * undecidable questions stated with their reasons and nothing claimed.
 */

import { CFL_INTERSECTION_DEMO } from '@tape-n-trace/engine'
import { ProductionList } from './grammar-input'
import { shortest } from '../lib/cfl-lab'

export function NonClosureCard(): React.JSX.Element {
  return (
    <section aria-label="Not closed under intersection" className="tnt-card" style={{ display: 'grid', gap: 8, borderLeft: '3px solid var(--tnt-dead)' }}>
      <strong style={{ fontSize: 14 }}>Not closed under intersection — Example 7.26</strong>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {[CFL_INTERSECTION_DEMO.l1, CFL_INTERSECTION_DEMO.l2].map((side) => (
          <div key={side.title}>
            <div style={{ fontSize: 14 }}>{side.title}</div>
            <ProductionList grammar={side.grammar} litIndices={new Set()} />
            <div className="tnt-muted" style={{ fontSize: 12, fontFamily: 'var(--tnt-mono)', marginTop: 4 }}>
              {shortest(side.grammar, 6).join('  ')}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 14 }}>
        Both are context-free — the grammars are right there. Their intersection is{' '}
        {CFL_INTERSECTION_DEMO.intersection}, and{' '}
        <a href={`/prove/pumping/${CFL_INTERSECTION_DEMO.pumpingGameId}?variant=cfl`}>the CFL pumping game</a> proves
        that is not context-free (Theorem 7.18). So the CFLs are not closed under intersection, and by
        De Morgan not under complement or difference either (Theorem 7.29) — while intersection with a{' '}
        <em>regular</em> language always works. (The book writes this example over 0, 1, 2; the letters
        are renamed a, b, c to match the game.)
      </p>
    </section>
  )
}

export function UndecidableCard(): React.JSX.Element {
  return (
    <section aria-label="What cannot be decided" className="tnt-card" style={{ display: 'grid', gap: 6 }}>
      <strong style={{ fontSize: 14 }}>Questions no page of this tool decides</strong>
      <p style={{ margin: 0, fontSize: 14 }}>
        For context-free grammars the following are undecidable — no algorithm answers them for every
        grammar, so this tool does not pretend to. Where a page touches one, it reports a bounded search
        and says so.
      </p>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, display: 'grid', gap: 3 }}>
        <li>Is G ambiguous? — the ambiguity detector searches up to a length and reports "no counterexample within bounds", never "unambiguous".</li>
        <li>Do G₁ and G₂ generate the same language? — only a sample comparison is offered, labelled as a sample.</li>
        <li>Is L(G₁) ∩ L(G₂) empty? — the intersection is not even context-free in general.</li>
        <li>Is L(G) = Σ*? Is L(G) regular? Is the complement of L(G) context-free?</li>
      </ul>
      <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
        The proofs reduce from Post’s correspondence problem, in chapters this course does not prescribe.
        What the syllabus does cover — emptiness, finiteness and membership are decidable for CFLs — is
        stated in §7.4, also outside the prescribed sections.
      </p>
    </section>
  )
}
