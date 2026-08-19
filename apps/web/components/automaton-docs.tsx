/**
 * The docs half of the triad — architecture.md §2.4.
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

export function AutomatonDocs({ machine }: { machine: FiniteAutomaton }): React.JSX.Element {
  const doc = DOCS[machine.kind]
  const synonyms = alsoWrittenAs(doc.canonical)

  return (
    <aside style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <section className="tnt-card">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>{doc.title}</h2>
        <p style={{ fontSize: 14, margin: '0 0 8px' }}>{doc.summary}</p>
        <p className="tnt-muted" style={{ fontSize: 12, margin: 0 }}>
          Hopcroft 2e, {doc.citation}
        </p>
        {synonyms.length === 0 ? null : (
          <p className="tnt-muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
            Also written <strong>{synonyms.slice(0, 2).join(', ')}</strong> in the question papers.
          </p>
        )}
      </section>

      <section className="tnt-card">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>This machine</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0, fontSize: 14 }}>
          <Dt>Q</Dt>
          <Dd>{`{${machine.states.join(', ')}}`}</Dd>
          <Dt>Σ</Dt>
          <Dd>{`{${machine.alphabet.join(', ')}}`}</Dd>
          <Dt>q₀</Dt>
          <Dd>{machine.start}</Dd>
          <Dt>F</Dt>
          <Dd>{machine.accepting.length === 0 ? '∅' : `{${machine.accepting.join(', ')}}`}</Dd>
          <Dt>|δ|</Dt>
          <Dd>{`${machine.transitions.length} transitions`}</Dd>
        </dl>
      </section>

      <section className="tnt-card">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>How to read the run</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: 'grid', gap: 5 }}>
          {doc.reading.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </aside>
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
    citation: '§2.2 — the extended transition function δ̂',
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
    citation: '§2.3 — nondeterminism and δ̂ over sets',
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
    citation: '§2.5 — ε-closures and δ̂ for ε-NFAs',
    reading: [
      'The run alternates: read a symbol, then take the ε-closure.',
      'The closure is shown as its own step, because it is the half that gets forgotten in exams.',
      'The empty string can be accepted without reading anything, if the closure of the start state contains an accepting state.',
    ],
  },
}

function Dt({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <dt style={{ fontFamily: 'var(--tnt-mono)', color: 'var(--tnt-text-muted)' }}>{children}</dt>
}

function Dd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <dd style={{ margin: 0, fontFamily: 'var(--tnt-mono)', wordBreak: 'break-word' }}>{children}</dd>
}
