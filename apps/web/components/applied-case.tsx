'use client'

/**
 * One case study, as a machine you can run.
 *
 * Cases written as an expression are converted to a minimal DFA here, and the
 * expression is shown beside it — the pair is the point of a Module 2 case
 * study. Everything below reuses the simulator's own controller, so a case study
 * gets the branch tree, the multi-run table and the transport bar for free.
 */

import { useMemo } from 'react'
import { appliedCase } from '@tape-n-trace/engine'
import { AutomatonRenderer } from '@tape-n-trace/ui'
import { AutomatonController } from './automaton-controller'
import { buildPlayground } from '../lib/playground'

export function AppliedCaseView({ caseId }: { caseId: string }): React.JSX.Element {
  const study = appliedCase(caseId)

  const derived = useMemo(() => {
    if (study === undefined) return null
    if (study.source.kind === 'machine') return { machine: study.source.machine, regex: null }

    const built = buildPlayground(study.source.source, study.source.alphabet)
    return built.dfa === null ? null : { machine: built.dfa, regex: study.source.source }
  }, [study])

  if (study === undefined) {
    return <p className="tnt-muted">No case study is registered under that name.</p>
  }

  if (derived === null) {
    return (
      <p role="alert" style={{ color: 'var(--tnt-marked)' }}>
        This case study&rsquo;s expression could not be built into a machine.
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {derived.regex === null ? null : (
        <section className="tnt-card" style={{ display: 'grid', gap: 6 }}>
          <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            The expression
          </h2>
          <code style={{ fontSize: 18 }}>{derived.regex}</code>
          <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
            The machine below is its minimal DFA — {derived.machine.states.length} states over{' '}
            {`{${derived.machine.alphabet.join(', ')}}`}. Open it in the{' '}
            <a href="/regex">playground</a> to see the parse tree and the ε-NFA it came from.
          </p>
        </section>
      )}

      {/* A static view of the machine, so the diagram is readable before any
          string is loaded into the controller below it. */}
      <section className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
        <AutomatonRenderer machine={derived.machine} instanceId="applied" />
      </section>

      <AutomatonController
        key={study.id}
        machine={derived.machine}
        suggested={study.suggested}
        initialInput={study.suggested[0] ?? ''}
      />
    </div>
  )
}
