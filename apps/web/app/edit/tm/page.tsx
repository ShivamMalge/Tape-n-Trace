import type { Metadata } from 'next'
import { TmEditor } from '../../../components/tm-editor'

export const metadata: Metadata = {
  title: 'Build a Turing machine',
  description: 'Write δ one move per line, see the machine drawn with X/Y → labels, and run it on the tape.',
}

export default function TmEditPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Build a Turing machine</h1>
      <p className="tnt-prose">
        Hopcroft 2e §8.2.2–8.2.4. Type δ the way the book tabulates it — one move per line — and the
        diagram, the checks and the run follow. Single-tape heads must move; give a multitape machine
        one symbol per tape and S is allowed.
      </p>
      <TmEditor />
    </div>
  )
}
