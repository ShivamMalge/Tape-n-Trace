import type { Metadata } from 'next'
import { LeftRecursionWorkbench } from '../../../components/left-recursion-workbench'

export const metadata: Metadata = {
  title: 'Left recursion elimination',
  description: 'A → Aα | β becomes A → βA′, A′ → αA′ | ε — one step per variable, in order.',
}

export default function LeftRecursionPage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/grammar">← Grammars and derivations</a>
      </p>
      <h1 style={{ fontSize: 26, marginTop: 8 }}>Left recursion elimination</h1>
      <p style={{ maxWidth: '64ch' }}>
        Examined at 8 marks, and the exam&rsquo;s own expression grammar is the opening preset.
        Immediate recursion A → Aα | β becomes A → βA′ with A′ → αA′ | ε; indirect recursion is
        handled by substituting earlier variables out first, one variable per step.
      </p>
      <LeftRecursionWorkbench />
    </div>
  )
}
