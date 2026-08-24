import type { Metadata } from 'next'
import { APPLIED } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'Applied case studies',
  description: "The department's Module 1 and 2 case studies, as working machines.",
}

export default function AppliedIndexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Applied case studies</h1>
      <p className="tnt-prose">
        These are the assignment case studies from the course&rsquo;s own list, built as machines you can
        run. Each carries the Bloom&rsquo;s level and SDG tag the department recorded against it.
      </p>
      <p className="tnt-prose tnt-muted tnt-sm">
        Several abstract their alphabet so the diagram stays readable — <code>a</code> for a letter,{' '}
        <code>d</code> for a digit. Each case says where it does so and why.
      </p>

      {[1, 2].map((module) => (
        <section key={module} style={{ marginTop: 'var(--tnt-space-5)' }}>
          <h2>
            Module {module} <span className="tnt-muted">— {module === 1 ? 'CO1, finite automata' : 'CO2, regular expressions'}</span>
          </h2>
          <ul className="tnt-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {APPLIED.filter((c) => c.module === module).map((study) => (
              <li key={study.id}>
                <a href={`/applied/${study.id}`} className="tnt-card tnt-stack-sm">
                  <strong>{study.title}</strong>
                  <span className="tnt-sm">{study.framing.split('. ')[0]}.</span>
                  <span className="tnt-meta">
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
