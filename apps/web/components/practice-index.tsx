'use client'

/**
 * The practice index — filterable the way revision actually happens.
 *
 * The CIE filters are the point: CIE-I covers the first two modules and CIE-II
 * the first four, because that is when the internal tests fall, and "show me
 * what CIE-I can ask" is the question a student has the week before it.
 */

import { useMemo, useState } from 'react'
import { EXERCISES } from '../content/exercises'
import { CIE_SCOPES, inCieScope, moduleOf, type CieScope } from '../lib/exercises'
import { topicById } from '../lib/topics'

type Filter = 'all' | CieScope | `m${1 | 2 | 3 | 4 | 5}`

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'CIE-I', label: 'CIE-I scope' },
  { id: 'CIE-II', label: 'CIE-II scope' },
  { id: 'm1', label: 'Module 1' },
  { id: 'm2', label: 'Module 2' },
  { id: 'm3', label: 'Module 3' },
  { id: 'm4', label: 'Module 4' },
  { id: 'm5', label: 'Module 5' },
]

export function PracticeIndex(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all')
  const [gradedOnly, setGradedOnly] = useState(false)

  const shown = useMemo(() => {
    let list = EXERCISES
    if (filter === 'CIE-I' || filter === 'CIE-II') {
      list = list.filter((e) => inCieScope(e, filter))
    } else if (filter !== 'all') {
      const module = Number(filter.slice(1))
      list = list.filter((e) => moduleOf(e) === module)
    }
    if (gradedOnly) list = list.filter((e) => e.grader !== 'manual')
    return list
  }, [filter, gradedOnly])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            style={{
              fontSize: 13,
              padding: '4px 12px',
              borderRadius: 999,
              border: `1px solid ${filter === id ? 'var(--tnt-current)' : 'var(--tnt-border)'}`,
              background: filter === id ? 'var(--tnt-current)' : 'var(--tnt-bg)',
              color: filter === id ? '#fff' : 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}

        <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13, marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={gradedOnly}
            onChange={(e) => setGradedOnly(e.target.checked)}
          />
          auto-graded only
        </label>
      </div>

      <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
        {shown.length} of {EXERCISES.length} exercises
        {filter === 'CIE-I' || filter === 'CIE-II'
          ? ` — modules ${(CIE_SCOPES[filter] as readonly number[]).join(', ')}`
          : ''}
        .
      </p>

      <ul style={{ display: 'grid', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
        {shown.map((exercise) => {
          const topic = topicById(exercise.topic)
          return (
            <li key={exercise.id}>
              <a
                href={`/practice/${exercise.id}`}
                className="tnt-card"
                style={{ display: 'grid', gap: 4, textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontSize: 15 }}>{exercise.prompt.split('\n')[0]}</span>
                <span className="tnt-muted" style={{ fontSize: 12 }}>
                  {exercise.marks} marks · {exercise.bloom} · {exercise.co} · Module{' '}
                  {topic?.module ?? '?'} ·{' '}
                  {exercise.grader === 'manual' ? 'marked by hand' : 'auto-graded'} · {exercise.source}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
