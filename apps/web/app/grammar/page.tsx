import type { Metadata } from 'next'
import { DerivationWorkbench } from '../../components/derivation-workbench'

export const metadata: Metadata = {
  title: 'Grammars and derivations',
  description: 'Type a grammar, derive a string, and watch the parse tree grow with the derivation.',
}

export default function GrammarPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Grammars and derivations</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §5.1–5.2. Type a grammar and a string; the engine finds a leftmost or rightmost
        derivation and replays it — sentential form, applied production and parse tree in step, with
        the yield read off the leaves so the tree-derivation correspondence is watched rather than
        asserted.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '64ch', fontSize: 14 }}>
        Also here: <a href="/grammar/ambiguity">the ambiguity detector</a>,{' '}
        <a href="/grammar/left-recursion">left recursion elimination</a> and, for Module 4,{' '}
        <a href="/grammar/simplify">the simplification pipeline and CNF</a>.
      </p>
      <DerivationWorkbench />
    </div>
  )
}
