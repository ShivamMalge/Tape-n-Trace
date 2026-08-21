import type { Metadata } from 'next'
import { TextSearch } from '../../components/text-search'

export const metadata: Metadata = {
  title: 'Text and keyword search',
  description: 'Keywords to a search NFA to a recognising DFA, scanning real text.',
}

export default function SearchPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Text and keyword search</h1>
      <p style={{ maxWidth: '62ch' }}>
        The application that makes finite automata feel like engineering. Give it some keywords and some
        text, and watch the head scan — with both machines shown side by side so the cost of guessing is
        visible.
      </p>
      <p className="tnt-muted" style={{ maxWidth: '62ch', fontSize: 14 }}>
        Hopcroft 2e §2.4.
      </p>
      <TextSearch />
    </div>
  )
}
