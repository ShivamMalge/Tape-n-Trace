import type { Metadata } from 'next'
import { LexerDemo } from '../../../components/lexer-demo'
import { ExtendedFeatures } from '../../../components/extended-features'

export const metadata: Metadata = {
  title: 'UNIX regular expressions',
  description:
    'What the extra operators in a UNIX regex do to the language — and which of them keep it regular.',
}

export default function UnixRegexPage(): React.JSX.Element {
  return (
    <div className="tnt-page" style={{ maxWidth: 860 }}>
      <h1>UNIX regular expressions</h1>
      <p className="tnt-muted" style={{ marginTop: 0 }}>
        Hopcroft 2e, §3.3.1 and §3.3.2.
      </p>

      <p className="tnt-prose">
        A UNIX regular expression has far more operators than the three of §3.1 — character classes,{' '}
        <code>+</code>, <code>?</code>, bounded repetition, anchors, backreferences. Most are pure
        convenience: they save typing and change nothing about what can be described. One of them is
        not, and knowing which is the difference between a shorthand and a different class of language.
      </p>

      <section className="tnt-section">
        <h2>Does this feature keep the language regular?</h2>
        <p className="tnt-prose tnt-muted" style={{ marginTop: 0 }}>
          Toggle each one to see what it is shorthand for. A feature that can be rewritten using only
          union, concatenation and star adds no power at all.
        </p>
        <ExtendedFeatures />
      </section>

      <section className="tnt-section">
        <h2>Lexical analysis</h2>
        <p className="tnt-prose">
          §3.3.2 — the first stage of a compiler. Each token class is a regular expression; the lexer
          runs them together and cuts the input into tokens by <strong>longest match</strong>, breaking
          ties in favour of the rule declared first.
        </p>
        <p className="tnt-prose">
          That tie-break is why a real lexer lists keywords above identifiers. Without it{' '}
          <code>if</code> inside <code>iffy</code> would end the token early, and the compiler would see
          a keyword where the programmer wrote a name.
        </p>
        <LexerDemo />
      </section>

      <section className="tnt-section">
        <h2>Where this shows up in the exam</h2>
        <p className="tnt-prose">
          The applied case studies on <a href="/applied">password validation</a>, mobile numbers and log
          analysis are all this material. So is the tutorial component &ldquo;lexical analyzer design
          using regular expressions&rdquo; on the syllabus.
        </p>
      </section>
    </div>
  )
}
