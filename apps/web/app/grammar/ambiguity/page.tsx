import type { Metadata } from 'next'
import { AmbiguityWorkbench } from '../../../components/ambiguity-workbench'

export const metadata: Metadata = {
  title: 'Ambiguity detector',
  description: 'Search for a string with two distinct leftmost derivations, with both trees drawn.',
}

export default function AmbiguityPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <p className="tnt-sm" style={{ margin: 0 }}>
        <a href="/grammar">← Grammars and derivations</a>
      </p>
      <h1 style={{ marginTop: 'var(--tnt-space-2)' }}>Is this grammar ambiguous?</h1>
      <p className="tnt-prose">
        Hopcroft 2e §5.4. A grammar is ambiguous when some string has two distinct leftmost
        derivations. The detector searches for one; a witness is a complete proof, and its two parse
        trees are drawn side by side.
      </p>
      <AmbiguityWorkbench />
    </div>
  )
}
