import type { Metadata } from 'next'
import { SyllabusIndex } from '../../components/syllabus-index'

export const metadata: Metadata = {
  title: 'Syllabus',
  description:
    'The course, module by module, with every topic linked to the page that teaches it — and the sections of Hopcroft 2e each one covers.',
}

export default function SyllabusPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Syllabus</h1>
      <p style={{ maxWidth: '70ch' }}>
        Every topic below links to the page that teaches it, and a test walks this list on every build: a topic pointing
        at a route that does not exist fails CI. So nothing here is an aspiration.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '70ch', fontSize: 14 }}>
        The syllabus is data rather than code — one shared topic graph, one file per institution. The two schemes below
        have identical section lists, which is why the second costs almost nothing to carry.
      </p>

      <div style={{ marginTop: 20 }}>
        <SyllabusIndex />
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18 }}>Deliberately out of scope</h2>
        <p style={{ maxWidth: '70ch', fontSize: 14 }}>
          Five topics the published section list excludes, kept out rather than built and mislabelled: PDA → CFG and the{' '}
          <code>[pXq]</code> construction (6.3.2), CYK and the decision properties of CFLs (7.4), the R⁽ᵏ⁾ᵢⱼ construction
          for DFA → RE (3.2.1, which the syllabus excludes by name), the decision properties of regular languages (4.3),
          and the formal-proof sections (1.2, 1.4). Post’s Correspondence Problem and P versus NP are absent from the
          scheme entirely. They remain on the roadmap as enrichment, after v1.0.
        </p>
        <p style={{ maxWidth: '70ch', fontSize: 14 }}>
          Minimisation is <em>not</em> among them: it lives in 4.4, which is listed. Left recursion elimination is not in
          Hopcroft at all — it is a parsing topic — but it is examined at 8 marks, so it is built and carries no section
          citation.
        </p>
      </section>
    </div>
  )
}
