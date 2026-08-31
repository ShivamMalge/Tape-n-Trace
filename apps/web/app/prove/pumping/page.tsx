import type { Metadata } from 'next'
import { PUMPING_LANGUAGES } from '@tape-n-trace/engine'

export const metadata: Metadata = {
  title: 'The pumping lemma game',
  description: 'The lemma as the two-player game it actually is.',
}

export default function PumpingIndexPage(): React.JSX.Element {
  const attack = PUMPING_LANGUAGES.filter((l) => !l.regular)
  const defend = PUMPING_LANGUAGES.filter((l) => l.regular)
  const cfl = PUMPING_LANGUAGES.filter((l) => !l.contextFree)

  return (
    <div className="tnt-page">
      <div className="tnt-page-head">
        <div>
          <h1>Pumping Lemma Game</h1>
          <p className="tnt-prose tnt-lead">
            The lemma is taught as a formula, but it is a two-player game with alternating quantifiers — ∃n, ∀w,
            ∃xyz, ∀i. You play the ∀ moves, the engine plays the ∃ moves, and it plays to win: it checks every
            decomposition and plays the one that is hardest to beat.
          </p>
        </div>
      </div>

      <Section title="Prove a language is not regular" hint="You attack. Beat the engine's best decomposition and the proof writes itself.">
        {attack.map((l) => (
          <Card key={l.id} href={`/prove/pumping/${l.id}`} title={l.title} notation={l.notation} difficulty={l.difficulty} verb="prove" />
        ))}
      </Section>

      <Section title="Defend a regular language" hint="Reverse mode: you claim n and split; the engine attacks. Surviving teaches why the lemma cannot prove regularity.">
        {defend.map((l) => (
          <Card key={l.id} href={`/prove/pumping/${l.id}?mode=defend`} title={l.title} notation={l.notation} difficulty={l.difficulty} verb="decide" />
        ))}
      </Section>

      <Section title="The CFL variant" hint="w = uvxyz with |vxy| ≤ n — v and y pump together. These languages are not even context-free.">
        {cfl.map((l) => (
          <Card key={l.id} href={`/prove/pumping/${l.id}?variant=cfl`} title={l.title} notation={l.notation} difficulty={l.difficulty} verb="prove" />
        ))}
      </Section>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="tnt-section">
      <h2>{title}</h2>
      <p className="tnt-prose tnt-muted" style={{ marginTop: 0 }}>{hint}</p>
      <div className="tnt-catalog" style={{ padding: '14px 0 0' }}>{children}</div>
    </section>
  )
}

function Card({
  href,
  title,
  notation,
  difficulty,
  verb,
}: {
  href: string
  title: string
  notation: string
  difficulty: string
  verb: 'prove' | 'decide'
}): React.JSX.Element {
  return (
    <a href={href} className="tnt-card tnt-tool-card">
      <span className="tnt-tool-card-head">
        <span className="tnt-verb" data-verb={verb}>
          {verb}
        </span>
        <span className="tnt-tool-card-mod">{difficulty}</span>
      </span>
      <span className="tnt-tool-card-title">{title}</span>
      <span className="tnt-tool-card-sum tnt-mono">{notation}</span>
    </a>
  )
}
