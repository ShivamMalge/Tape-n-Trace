import type { Metadata } from 'next'
import { PracticeIndex } from '../../components/practice-index'

export const metadata: Metadata = {
  title: 'Practice',
  description: 'The question bank, auto-graded where the mathematics allows it.',
}

export default function PracticePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1>Practice</h1>
      <p className="tnt-prose">
        The department&rsquo;s own question bank. Construction exercises are graded{' '}
        <strong>exactly</strong>: any correct machine passes, and a wrong one gets the shortest string
        it fails on — with both machines run on it side by side. Prose questions say so rather than
        pretending to be gradable.
      </p>
      <PracticeIndex />
    </div>
  )
}
