import type { Metadata } from 'next'
import { APPLIED } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'Applied case studies',
  description: "The department's Module 1 and 2 case studies, as working machines.",
}

export default function AppliedIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Applied case studies</h1>
      <p style={{ maxWidth: '62ch' }}>
        These are the assignment case studies from the course&rsquo;s own list, built as machines you can
        run. Each carries the Bloom&rsquo;s level and SDG tag the department recorded against it.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '62ch', fontSize: 14 }}>
        Several abstract their alphabet so the diagram stays readable — <code>a</code> for a letter,{' '}
        <code>d</code> for a digit. Each case says where it does so and why.
      </p>

      {[1, 2].map((module) => (
        <section key={module} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>
            Module {module} <span className="tnt-muted">— {module === 1 ? 'CO1, finite automata' : 'CO2, regular expressions'}</span>
          </h2>
          <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
            {APPLIED.filter((c) => c.module === module).map((study) => (
              <li key={study.id}>
                <a
                  href={`/applied/${study.id}`}
                  className="tnt-card"
                  style={{ display: 'grid', gap: 5, textDecoration: 'none', color: 'inherit' }}
                >
                  <strong style={{ fontSize: 16 }}>{study.title}</strong>
                  <span style={{ fontSize: 14 }}>{study.framing.split('. ')[0]}.</span>
                  <span className="tnt-muted" style={{ fontSize: 12 }}>
                    {study.co} · {study.bloom} · {study.sdg}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
