import type { Metadata } from 'next'
import { SigmaStarWidget } from '../../../components/sigma-star-widget'
import { TERMS } from '../../../lib/synonyms'

export const metadata: Metadata = {
  title: 'Strings and languages',
  description: 'Alphabets, powers, Σ*, length and concatenation — Hopcroft 2e §1.5.',
}

export default function StringsPrimerPage(): React.JSX.Element {
  return (
    <div className="tnt-page" style={{ maxWidth: 820 }}>
      <h1>Strings and languages</h1>
      <p className="tnt-muted" style={{ marginTop: 0 }}>
        Hopcroft 2e, §1.5 — the vocabulary the rest of the subject is written in.
      </p>

      <Section title="Alphabet">
        <p>
          An <strong>alphabet</strong> Σ is a finite, non-empty set of symbols. Σ = {'{0, 1}'} is the
          binary alphabet; Σ = {'{a, b, c}'} is another. A symbol is atomic — it has no parts.
        </p>
      </Section>

      <Section title="String">
        <p>
          A <strong>string</strong> over Σ is a finite sequence of symbols from Σ. Its{' '}
          <strong>length</strong> |w| is how many symbols it has, counting repeats: |0110| = 4.
        </p>
        <p>
          The <strong>empty string</strong> ε is the string of length zero. It is a string like any
          other — it is not "nothing", and it is not the same as the empty set. Half the marks lost on
          this topic come from that one confusion.
        </p>
      </Section>

      <Section title="Powers of an alphabet">
        <p>
          Σ<sup>k</sup> is the set of strings of length exactly <em>k</em>. So Σ<sup>1</sup> is
          essentially Σ itself, Σ<sup>2</sup> is every pair, and:
        </p>
        <p className="tnt-code-block">
          Σ<sup>0</sup> = {'{ε}'}
        </p>
        <p>
          One element, not zero — whatever the alphabet is, there is exactly one string of length 0
          over it.
        </p>
      </Section>

      <Section title="Σ* and Σ⁺">
        <p>
          <strong>Σ*</strong> is the set of <em>all</em> strings over Σ: Σ<sup>0</sup> ∪ Σ<sup>1</sup> ∪
          Σ<sup>2</sup> ∪ … It is infinite for any non-empty alphabet, though every string in it is
          finite. <strong>Σ⁺</strong> is the same set without ε.
        </p>
        <p>
          A <strong>language</strong> over Σ is any subset of Σ*. That is the whole definition — which
          is why "is this language regular?" is a question worth a whole module.
        </p>
      </Section>

      <Section title="Try it">
        <p className="tnt-muted" style={{ marginTop: 0 }}>
          Change the alphabet and the bound. Watch the count, not just the list.
        </p>
        <SigmaStarWidget />
      </Section>

      <Section title="Concatenation">
        <p>
          If x and y are strings, <strong>xy</strong> is x followed by y, and |xy| = |x| + |y|.
          Concatenation is associative, and ε is its identity: εw = wε = w.
        </p>
      </Section>

      <Section title="The same thing, spelled differently">
        <p>
          The question papers and the textbook do not always agree on names. These all mean the same
          thing, and this tool accepts either spelling.
        </p>
        <table className="tnt-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th scope="col">Textbook</th>
              <th scope="col">Also written</th>
            </tr>
          </thead>
          <tbody>
            {TERMS.map((term) => (
              <tr key={term.canonical}>
                <td>
                  <strong>{term.canonical}</strong>{' '}
                  <span className="tnt-muted">— {term.expansion}</span>
                </td>
                <td className="tnt-muted">{term.alternatives.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="tnt-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
