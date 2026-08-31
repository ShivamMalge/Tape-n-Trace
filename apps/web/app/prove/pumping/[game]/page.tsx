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
    <div className="tnt-page">
      <div className="tnt-page-head">
        <div>
          <p className="tnt-meta" style={{ margin: '0 0 6px' }}>
            <a href="/prove/pumping">← All games</a>
          </p>
          <h1>{language.title}</h1>
        </div>
        <p className="tnt-page-links">
          {playMode === 'defend'
            ? 'Reverse mode — you defend.'
            : playVariant === 'cfl'
              ? 'The CFL variant — v and y pump together.'
              : 'The adversary game, Hopcroft 2e §4.1.'}
        </p>
      </div>

      <PumpingGame key={`${game}-${playMode}-${playVariant}`} languageId={game} mode={playMode} variant={playVariant} />
    </div>
  )
}
