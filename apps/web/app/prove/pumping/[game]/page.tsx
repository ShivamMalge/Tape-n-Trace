import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PUMPING_LANGUAGES, pumpingLanguage } from '@tape-n-trace/engine'
import { PumpingGame } from '../../../../components/pumping-game'

interface PageProps {
  params: Promise<{ game: string }>
  searchParams: Promise<{ mode?: string; variant?: string }>
}

export function generateStaticParams(): { game: string }[] {
  return PUMPING_LANGUAGES.map((l) => ({ game: l.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { game } = await params
  const language = pumpingLanguage(game)
  return language === undefined ? { title: 'Game not found' } : { title: `Pumping — ${language.title}` }
}

export default async function PumpingGamePage({ params, searchParams }: PageProps): Promise<React.JSX.Element> {
  const { game } = await params
  const { mode, variant } = await searchParams
  const language = pumpingLanguage(game)
  if (language === undefined) notFound()

  const playMode = mode === 'defend' && language.regular ? 'defend' : 'prove'
  const playVariant = variant === 'cfl' && !language.contextFree ? 'cfl' : 'regular'

  return (
    <div className="tnt-page" style={{ maxWidth: 880 }}>
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/prove/pumping">← All games</a>
      </p>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>{language.title}</h1>
      <p style={{ marginTop: 0 }}>
        <code style={{ fontSize: 16 }}>{language.notation}</code>
        <span className="tnt-muted" style={{ fontSize: 13, marginLeft: 10 }}>
          {playMode === 'defend' ? 'reverse mode — you defend' : playVariant === 'cfl' ? 'CFL variant — you attack' : 'you attack'}
        </span>
      </p>

      <PumpingGame key={`${game}-${playMode}-${playVariant}`} languageId={game} mode={playMode} variant={playVariant} />
    </div>
  )
}
