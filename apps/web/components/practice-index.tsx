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
    <div className="tnt-stack">
      <div className="tnt-row tnt-row-tight">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="tnt-chip"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
          >
            {label}
          </button>
        ))}

        <label className="tnt-field-row" style={{ marginLeft: 'var(--tnt-space-2)' }}>
          <input
            type="checkbox"
            checked={gradedOnly}
            onChange={(e) => setGradedOnly(e.target.checked)}
          />
          auto-graded only
        </label>
      </div>

      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        {shown.length} of {EXERCISES.length} exercises
        {filter === 'CIE-I' || filter === 'CIE-II'
          ? ` — modules ${(CIE_SCOPES[filter] as readonly number[]).join(', ')}`
          : ''}
        .
      </p>

      <ul className="tnt-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {shown.map((exercise) => {
          return (
            <li key={exercise.id}>
              {/* `a.tnt-card` sets `display: block`, and that beats `.tnt-stack-sm`
                  on specificity, so the two-line card layout stays inline. */}
              <a
                href={`/practice/${exercise.id}`}
                className="tnt-card"
                style={{ display: 'grid', gap: 'var(--tnt-space-1)' }}
              >
                <span>{exercise.prompt.split('\n')[0]}</span>
                <span className="tnt-meta">
                  {exercise.marks} marks · {exercise.bloom} · {exercise.co} · Module{' '}
                  {moduleOf(exercise) ?? '?'} ·{' '}
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
