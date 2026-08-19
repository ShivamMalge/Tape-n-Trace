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
      <h1 style={{ fontSize: 26 }}>Strings and languages</h1>
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
        <p style={{ fontFamily: 'var(--tnt-mono)', background: 'var(--tnt-surface)', padding: '8px 12px', borderRadius: 'var(--tnt-radius)' }}>
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
        <table style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}>
          <thead>
            <tr>
              <th scope="col" style={thStyle}>
                Textbook
              </th>
              <th scope="col" style={thStyle}>
                Also written
              </th>
            </tr>
          </thead>
          <tbody>
            {TERMS.map((term) => (
              <tr key={term.canonical} style={{ borderTop: '1px solid var(--tnt-border)' }}>
                <td style={{ padding: '5px 8px' }}>
                  <strong>{term.canonical}</strong>{' '}
                  <span className="tnt-muted">— {term.expansion}</span>
                </td>
                <td style={{ padding: '5px 8px' }} className="tnt-muted">
                  {term.alternatives.join(', ')}
                </td>
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
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 19 }}>{title}</h2>
      {children}
    </section>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '5px 8px',
  fontSize: 12,
  color: 'var(--tnt-text-muted)',
}
