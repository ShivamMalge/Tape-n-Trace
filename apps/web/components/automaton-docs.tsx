/**
 * The docs half of the triad — architecture.md §2.4 — as the design's docs
 * cards (artboard 00): the kind's definition, the machine's tuple, and how to
 * read the run, each a `<details>` with its citation set right.
 *
 * A server component: it renders prose about the machine on screen and holds no
 * state. Kept beside the controller rather than on a separate "theory" page,
 * because the moment a student needs the definition of δ̂ is the moment they are
 * watching it run.
 *
 * Synonyms are shown deliberately: the question papers write DFSM and NDFSM
 * where Hopcroft writes DFA and NFA, and a student revising against a past paper
 * needs to know those are the same thing.
 */

import type { FiniteAutomaton } from '@tape-n-trace/engine'
import { alsoWrittenAs } from '../lib/synonyms'
import { DocsCard } from './docs-card'

export function AutomatonDocs({ machine }: { machine: FiniteAutomaton }): React.JSX.Element {
  const doc = DOCS[machine.kind]
  const synonyms = alsoWrittenAs(doc.canonical)

  return (
    <>
      <DocsCard title={doc.title} cite={`Hopcroft 2e ${doc.citation}`} open>
        <p>{doc.summary}</p>
        {synonyms.length === 0 ? null : (
          <p className="tnt-meta">
            Also written <strong>{synonyms.slice(0, 2).join(', ')}</strong> in the question papers.
          </p>
        )}
      </DocsCard>

      <DocsCard title="This machine" cite={`${machine.states.length} states`} open>
        <dl className="tnt-tuple">
          <dt>Q</dt>
          <dd>{`{${machine.states.join(', ')}}`}</dd>
          <dt>Σ</dt>
          <dd>{`{${machine.alphabet.join(', ')}}`}</dd>
          <dt>q₀</dt>
          <dd>{machine.start}</dd>
          <dt>F</dt>
          <dd>{machine.accepting.length === 0 ? '∅' : `{${machine.accepting.join(', ')}}`}</dd>
          <dt>|δ|</dt>
          <dd>{`${machine.transitions.length} transitions`}</dd>
        </dl>
      </DocsCard>

      <DocsCard title="How to read the run">
        <ul className="tnt-docs-list">
          {doc.reading.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </DocsCard>
    </>
  )
}

interface KindDoc {
  canonical: string
  title: string
  summary: string
  citation: string
  reading: string[]
}

const DOCS: Record<FiniteAutomaton['kind'], KindDoc> = {
  DFA: {
    canonical: 'DFA',
    title: 'Deterministic finite automaton',
    summary:
      'Exactly one move per state and symbol, so a run is a single path. The string is accepted if that path ends in an accepting state.',
    citation: '§2.2 — δ̂',
    reading: [
      'One state is current at a time; it is outlined in blue.',
      'The transition just taken is drawn in blue, and the symbol just read is boxed.',
      'If a state has no move on the next symbol, the run dies there and the string is rejected — that is the implicit dead state a textbook diagram leaves off.',
    ],
  },
  NFA: {
    canonical: 'NFA',
    title: 'Nondeterministic finite automaton',
    summary:
      'A state may have several moves on a symbol, or none. The string is accepted if *any* branch ends in an accepting state.',
    citation: '§2.3 — δ̂ over sets',
    reading: [
      'Every live branch is shown at once, as a tree rather than a path.',
      'A branch with no move dies where it stands and stays greyed on the tree, labelled with the step it died at.',
      'One surviving accepting branch is enough. The others dying costs nothing.',
    ],
  },
  ENFA: {
    canonical: 'ε-NFA',
    title: 'Finite automaton with ε-transitions',
    summary:
      'Moves that consume no input. The machine is really in the whole ε-closure of its current set of states at every moment.',
    citation: '§2.5 — ε-closures',
    reading: [
      'The run alternates: read a symbol, then take the ε-closure.',
      'The closure is shown as its own step, because it is the half that gets forgotten in exams.',
      'The empty string can be accepted without reading anything, if the closure of the start state contains an accepting state.',
    ],
  },
}
