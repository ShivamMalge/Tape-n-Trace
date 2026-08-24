import { CATALOG } from '../lib/catalog'
import type { Tool } from '../lib/catalog'

const GROUPS: { verb: Tool['verb']; title: string; blurb: string }[] = [
  {
    verb: 'simulate',
    title: 'Simulate',
    blurb: 'Run a machine on an input and watch every configuration. Nondeterminism is drawn as a tree, not a path.',
  },
  {
    verb: 'convert',
    title: 'Convert',
    blurb: 'Turn one representation into another, one intermediate artifact at a time — the steps you would write on paper.',
  },
  {
    verb: 'prove',
    title: 'Prove',
    blurb: 'The arguments that cannot be simulated: pumping lemmas, closure results, diagonalization, reductions.',
  },
  {
    verb: 'decide',
    title: 'Practice',
    blurb: 'Construction exercises graded exactly, with the shortest disagreeing string as feedback.',
  },
  { verb: 'learn', title: 'Learn', blurb: 'The groundwork, the case studies, and the map of where every language sits.' },
]

export default function HomePage(): React.JSX.Element {
  const planned = CATALOG.filter((t) => t.status === 'planned')

  return (
    <div className="tnt-page">
      <h1>Tape&rsquo;n&rsquo;Trace</h1>
      <p className="tnt-prose tnt-lg">
        An interactive Theory of Computation workbench. Draw a machine, run it, watch it move — and see the{' '}
        <em>construction</em> happen, not just its answer.
      </p>
      <p className="tnt-prose tnt-muted tnt-sm">
        Every algorithm here returns a trace: an ordered list of steps, each carrying one sentence of exam-language
        narration and the full state of the artifact being built. The screen is a pure function of that trace.
      </p>

      {GROUPS.map((group) => {
        const tools = CATALOG.filter((t) => t.status === 'live' && t.verb === group.verb)
        if (tools.length === 0) return null
        return (
          <section key={group.verb} className="tnt-section">
            <h2>{group.title}</h2>
            <p className="tnt-prose tnt-muted tnt-sm" style={{ marginTop: 0 }}>
              {group.blurb}
            </p>
            <div className="tnt-panels" style={{ marginTop: 'var(--tnt-space-3)' }}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )
      })}

      {planned.length === 0 ? null : (
        <section className="tnt-section">
          <h2>Being built</h2>
          <p className="tnt-prose tnt-muted tnt-sm" style={{ marginTop: 0 }}>
            Listed with the phase that builds them. Nothing here is clickable yet, because nothing here works yet — a
            capability is never claimed before it is real.
          </p>
          <ul className="tnt-stack-sm" style={{ paddingLeft: 18, margin: 0 }}>
            {planned.map((tool) => (
              <li key={tool.id} className="tnt-sm">
                <strong>{tool.title}</strong> <span className="tnt-muted">— {tool.summary}</span>{' '}
                <code className="tnt-code tnt-xs">{tool.phase}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ToolCard({ tool }: { tool: Tool }): React.JSX.Element {
  return (
    <a href={tool.href} className="tnt-card tnt-stack-sm">
      <strong>{tool.title}</strong>
      <span className="tnt-sm tnt-muted">{tool.summary}</span>
      <span className="tnt-meta">Module {tool.modules.join(', ')}</span>
    </a>
  )
}
