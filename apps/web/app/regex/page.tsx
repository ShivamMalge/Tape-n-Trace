import type { Metadata } from 'next'
import { RegexPlayground } from '../../components/regex-playground'

export const metadata: Metadata = {
  title: 'Regular expression playground',
  description: 'An expression, its parse tree, its ε-NFA, its minimal DFA and its language — all at once.',
}

export default function RegexPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Regular expression playground</h1>
      <p style={{ maxWidth: '62ch' }}>
        Four views of one expression, kept in step. Change the expression and the parse tree, the
        Thompson ε-NFA, the minimal DFA and the list of accepted strings all move together — which is
        the quickest way to see what a change to the expression actually did.
      </p>
      <RegexPlayground />
    </div>
  )
}
