'use client'

/**
 * Everything wrong with the machine, at once.
 *
 * `validateFA` returns every violation rather than the first precisely so this
 * list can exist (§4). Showing one error, having the student fix it, and then
 * showing the next is the failure mode the engine's error channel was designed
 * to avoid — so this component never slices the array.
 */

import type { ValidationError } from '@tape-n-trace/engine'

export function ValidationErrors({
  errors,
}: {
  errors: readonly ValidationError[]
}): React.JSX.Element | null {
  if (errors.length === 0) return null

  return (
    <section role="alert" className="tnt-card" style={{ borderColor: 'var(--tnt-marked)' }}>
      <h2 style={{ color: 'var(--tnt-marked)' }}>
        {errors.length === 1
          ? 'There is a problem with this machine'
          : `There are ${errors.length} problems with this machine`}
      </h2>

      <ul className="tnt-stack-sm" style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((error, i) => (
          <li key={`${error.code}-${error.subject.id ?? i}`}>
            {error.message}
            {error.subject.id === undefined ? null : (
              <code className="tnt-muted tnt-xs" style={{ marginLeft: 'var(--tnt-space-2)' }}>
                {error.subject.kind} {error.subject.id}
              </code>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
