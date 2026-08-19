import { CATALOG } from '../lib/catalog'
import type { Tool } from '../lib/catalog'

export default function HomePage(): React.JSX.Element {
  const live = CATALOG.filter((t) => t.status === 'live')
  const planned = CATALOG.filter((t) => t.status === 'planned')

  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 30 }}>Tape-n-Trace</h1>
      <p style={{ fontSize: 17, maxWidth: '62ch' }}>
        An interactive Theory of Computation workbench. Draw a machine, run it, watch it move — and see
        the <em>construction</em> happen, not just its answer.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20 }}>Available now</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {live.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20 }}>Being built</h2>
        <p className="tnt-muted" style={{ fontSize: 14, marginTop: 0, maxWidth: '62ch' }}>
          Listed with the phase that builds them. Nothing here is clickable yet, because nothing here
          works yet — a capability is never claimed before it is real.
        </p>
        <ul style={{ display: 'grid', gap: 6, paddingLeft: 18, margin: 0 }}>
          {planned.map((tool) => (
            <li key={tool.id} style={{ fontSize: 14 }}>
              <strong>{tool.title}</strong> <span className="tnt-muted">— {tool.summary}</span>{' '}
              <code className="tnt-muted" style={{ fontSize: 12 }}>
                {tool.phase}
              </code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ToolCard({ tool }: { tool: Tool }): React.JSX.Element {
  return (
    <a
      href={tool.href}
      className="tnt-card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 }}
    >
      <strong style={{ fontSize: 16 }}>{tool.title}</strong>
      <span style={{ fontSize: 14 }} className="tnt-muted">
        {tool.summary}
      </span>
      <span style={{ fontSize: 12 }} className="tnt-muted">
        Module {tool.modules.join(', ')}
      </span>
    </a>
  )
}
