/**
 * Home — design artboard 01: the hero, a stat pair, and the catalog as a
 * three-column grid of verb-tagged cards. Every card is `CATALOG`, THE ONE
 * LIST (architecture.md §3); the counts are computed from it rather than typed.
 */

import { CATALOG, NAV, liveTools } from '../lib/catalog'
import type { Tool } from '../lib/catalog'

const WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
  'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five',
  'Twenty-six', 'Twenty-seven', 'Twenty-eight', 'Twenty-nine', 'Thirty',
]

export default function HomePage(): React.JSX.Element {
  const live = liveTools()
  const planned = CATALOG.filter((t) => t.status === 'planned')
  const count = live.length

  return (
    <div className="tnt-page">
      <section className="tnt-hero">
        <div className="tnt-hero-copy">
          <h1>{WORDS[count] ?? String(count)} instruments for one course.</h1>
          <p className="tnt-hero-lead">
            Every tool runs step by step and writes down what it did in the language your exam expects. Nothing
            here hides its working.
          </p>
        </div>
        <div className="tnt-hero-stats">
          <div className="tnt-stat">
            <span className="tnt-stat-value">{count}</span>
            <span className="tnt-stat-caption">tools</span>
          </div>
          <div className="tnt-stat">
            <span className="tnt-stat-value">{NAV.length}</span>
            <span className="tnt-stat-caption">modules</span>
          </div>
        </div>
      </section>

      <section id="catalog" aria-label="All tools" className="tnt-catalog">
        {live.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </section>

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
    <a href={tool.href} className="tnt-card tnt-tool-card">
      <span className="tnt-tool-card-head">
        <span className="tnt-verb" data-verb={tool.verb}>
          {tool.verb}
        </span>
        <span className="tnt-tool-card-mod">{tool.modules.map((m) => `M${m}`).join(' ')}</span>
      </span>
      <span className="tnt-tool-card-title">{tool.title}</span>
      <span className="tnt-tool-card-sum">{tool.summary}</span>
    </a>
  )
}
