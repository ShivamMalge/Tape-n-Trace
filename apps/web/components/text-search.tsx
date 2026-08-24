'use client'

/**
 * Keyword search — Hopcroft 2e §2.4.
 *
 * Two machines side by side with their state counts, and a head that scans the
 * text. The point of the pairing is the contrast: the NFA is trivial to write
 * down and guesses where a keyword starts; the DFA never guesses and reads each
 * character once.
 *
 * Both machines are drawn by `AutomatonRenderer` and the scan comes out of
 * `simulateDFA`, so there is no second simulator and no second diagram code path
 * anywhere in the feature.
 */

import { useMemo, useState } from 'react'
import { isOk, searchText } from '@tape-n-trace/engine'
import { AutomatonRenderer } from '@tape-n-trace/ui'
import { useDebounced } from '../lib/use-debounced'

const PRESETS = [
  { id: 'webay', keywords: 'web, ebay', text: 'webay', note: "Hopcroft's own example — the two matches overlap." },
  { id: 'prose', keywords: 'the, hen, then', text: 'then the hen went', note: 'Keywords that share prefixes and suffixes.' },
  { id: 'log', keywords: 'ERROR, WARN', text: 'INFO ok / WARN slow / ERROR failed', note: 'Scanning a log line.' },
  { id: 'dna', keywords: 'GATTA, ATTAC', text: 'GATTACA', note: 'Overlapping matches in a genome-style string.' },
]

export function TextSearch(): React.JSX.Element {
  const [keywordText, setKeywordText] = useState('web, ebay')
  const [text, setText] = useState('webay')

  const settledKeywords = useDebounced(keywordText, 220)
  const settledText = useDebounced(text, 220)

  const keywords = useMemo(
    () => settledKeywords.split(',').map((k) => k.trim()).filter((k) => k !== ''),
    [settledKeywords],
  )

  const outcome = useMemo(() => {
    const result = searchText(keywords, settledText)
    // `errors` is never empty on failure, but the type does not know that.
    return isOk(result)
      ? { search: result.value, error: null }
      : { search: null, error: result.errors[0] ?? null }
  }, [keywords, settledText])

  const [head, setHead] = useState<number | null>(null)
  const search = outcome.search
  const characters = [...settledText]

  // The state the DFA is in at the position the reader is pointing at, so the
  // diagram and the text agree about where the scan has got to.
  const current = head === null ? null : (search?.path[head] ?? null)
  const covered = useMemo(() => coveredPositions(search?.matches ?? []), [search])

  return (
    <div className="tnt-stack">
      <section className="tnt-card tnt-stack">
        <Field label="Keywords">
          <input
            value={keywordText}
            onChange={(e) => setKeywordText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="tnt-input tnt-input-mono"
            style={{ minWidth: 220 }}
          />
        </Field>

        <Field label="Text to search">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="tnt-input tnt-input-mono"
            style={{ minWidth: 320, flex: '1 1 320px' }}
          />
        </Field>

        <div className="tnt-row tnt-row-tight">
          <span className="tnt-sm tnt-muted">Try:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.note}
              className="tnt-chip tnt-mono"
              onClick={() => {
                setKeywordText(preset.keywords)
                setText(preset.text)
                setHead(null)
              }}
            >
              {preset.keywords}
            </button>
          ))}
        </div>

        {outcome.error === null ? null : (
          <p role="alert" className="tnt-sm" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
            {outcome.error.message}
          </p>
        )}
      </section>

      {search === null ? null : (
        <>
          <section className="tnt-stack-sm">
            <h2 style={{ margin: 0 }}>The scan</h2>
            <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
              Hover or focus a character to see where the DFA had got to after reading it. Highlighted
              runs are matches — overlapping ones are all reported.
            </p>

            <div className="tnt-card tnt-row tnt-row-tight tnt-card-plain">
              {characters.length === 0 ? (
                <span className="tnt-sm tnt-muted">Nothing to scan yet.</span>
              ) : (
                characters.map((char, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseEnter={() => setHead(index)}
                    onFocus={() => setHead(index)}
                    onMouseLeave={() => setHead(null)}
                    onBlur={() => setHead(null)}
                    aria-label={`Position ${index}, "${char}", state ${search.path[index] ?? 'start'}`}
                    className="tnt-mono tnt-lg"
                    style={{
                      minWidth: 22,
                      padding: 'var(--tnt-space-1) 2px',
                      border: `1px solid ${head === index ? 'var(--tnt-current)' : 'transparent'}`,
                      borderRadius: 'var(--tnt-radius-sm)',
                      background: covered.has(index) ? 'var(--tnt-accepting-soft)' : 'transparent',
                      color: covered.has(index) ? 'var(--tnt-accepting)' : 'var(--tnt-text)',
                      cursor: 'pointer',
                    }}
                  >
                    {char === ' ' ? '␣' : char}
                  </button>
                ))
              )}
            </div>

            <p style={{ margin: 0 }}>
              {search.matches.length === 0 ? (
                <span className="tnt-muted">No keyword occurs in this text.</span>
              ) : (
                <>
                  <strong>
                    {search.matches.length} {search.matches.length === 1 ? 'match' : 'matches'}:
                  </strong>{' '}
                  {search.matches
                    .map((m) => `"${m.keyword}" at ${m.start}`)
                    .join(', ')}
                  .
                </>
              )}
              {current === null ? null : (
                <span className="tnt-muted">
                  {' '}
                  After position {head}, the DFA is in <code>{current}</code>.
                </span>
              )}
            </p>
          </section>

          <div className="tnt-panels">
            <Machine
              title="The guessing NFA"
              subtitle={`§2.4.2 — ${search.machines.nfa.states.length} states, ${search.machines.nfa.transitions.length} transitions`}
              note="One chain per keyword, and a start state that loops on everything so a keyword may begin anywhere."
            >
              <AutomatonRenderer machine={search.machines.nfa} instanceId="ts-nfa" />
            </Machine>

            <Machine
              title="The recognising DFA"
              subtitle={`§2.4.3 — ${search.machines.dfa.states.length} states, ${search.machines.dfa.transitions.length} transitions`}
              note="One state per keyword prefix. It never guesses, so it reads each character exactly once."
            >
              <AutomatonRenderer machine={search.machines.dfa} instanceId="ts-dfa" />
            </Machine>
          </div>
        </>
      )}
    </div>
  )
}

/** Every text position covered by some match, for highlighting. */
function coveredPositions(matches: readonly { start: number; end: number }[]): Set<number> {
  const covered = new Set<number>()
  for (const match of matches) {
    for (let i = match.start; i < match.end; i++) covered.add(i)
  }
  return covered
}

function Machine({
  title,
  subtitle,
  note,
  children,
}: {
  title: string
  subtitle: string
  note: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="tnt-stack-sm">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="tnt-meta" style={{ margin: 0 }}>
        {subtitle}
      </p>
      <div className="tnt-card tnt-scroll-x" style={{ background: 'var(--tnt-bg)', minWidth: 0 }}>
        {children}
      </div>
      <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
        {note}
      </p>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="tnt-row">
      <span className="tnt-sm tnt-muted" style={{ minWidth: 110 }}>
        {label}
      </span>
      {children}
    </label>
  )
}
