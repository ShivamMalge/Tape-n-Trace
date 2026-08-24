import type { Metadata } from 'next'
import { TmReductionWorkbench } from '../../../components/tm-reduction-workbench'

export const metadata: Metadata = {
  title: 'Many tapes to one',
  description: 'Theorem 8.9 animated: a multitape machine and its single-tape simulation side by side, with the moves counted.',
}

export default function TmMultitapePage(): React.JSX.Element {
  return (
    <div className="tnt-page">
      <h1 style={{ fontSize: 26 }}>Many tapes to one</h1>
      <p style={{ maxWidth: '64ch' }}>
        Hopcroft 2e §8.4.2–8.4.3. Extra tapes add no power: a one-tape machine N keeps 2k tracks —
        each tape’s contents and a marker for where its head is — and simulates one move of M by
        sweeping right to read under the markers and sweeping left to write and move them. Theorem
        8.10 prices it: at most 4n + 2k moves of N per move of M.
      </p>
      <TmReductionWorkbench />
    </div>
  )
}
