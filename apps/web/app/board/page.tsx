import type { Metadata } from 'next'
import type { FiniteAutomaton } from '@tape-n-trace/engine'
import { Board } from '../../components/board/board'

/** `?demo` opens the board on a drawn example — strings ending in 01 — with the table out. */
const DEMO: FiniteAutomaton = {
  kind: 'ENFA',
  states: ['q0', 'q1', 'q2'],
  alphabet: ['0', '1'],
  transitions: [
    { id: 'q0-[0]->q0', from: 'q0', read: '0', to: 'q0' },
    { id: 'q0-[1]->q0', from: 'q0', read: '1', to: 'q0' },
    { id: 'q0-[0]->q1', from: 'q0', read: '0', to: 'q1' },
    { id: 'q1-[1]->q2', from: 'q1', read: '1', to: 'q2' },
  ],
  start: 'q0',
  accepting: ['q2'],
  layout: { q0: { x: 170, y: 330 }, q1: { x: 420, y: 300 }, q2: { x: 660, y: 330 } },
}

export const metadata: Metadata = {
  title: 'Classroom board',
  description:
    'Draw a finite automaton freehand on a dark board; each stroke is recognised and redrawn, and the machine it makes runs from the same screen.',
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}): Promise<React.JSX.Element> {
  const { demo } = await searchParams
  return (
    <div className="tnt-page">
      <div className="tnt-page-head">
        <div>
          <h1>Classroom board</h1>
          <p className="tnt-prose tnt-lead">
            For the lecture theatre. Draw with a pen or a finger: a loop is a state, a stroke from one state to
            another is an arc, a loop inside a state makes it accepting, a stroke into a state from its left
            makes it the start. Pick each arc&rsquo;s symbols from the chips. When the machine is drawn, press
            Simulate.
          </p>
        </div>
        <p className="tnt-page-links">
          The same engine as <a href="/simulate">the simulator</a> runs what you draw; nothing is guessed from
          handwriting. In <a href="/practice">Practice</a> the same board answers an exercise.
        </p>
      </div>
      {demo === undefined ? <Board /> : <Board initial={DEMO} openInitially />}
    </div>
  )
}
