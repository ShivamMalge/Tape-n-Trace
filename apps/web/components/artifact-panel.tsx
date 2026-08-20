'use client'

/**
 * The "artifact table underneath" slot of the stepper shell.
 *
 * Draws whatever `artifactOf` decided this conversion produces. Deliberately
 * dumb: every choice about *what* an artifact is was made in `lib/artifact.ts`,
 * so adding a conversion never means editing this file.
 */

import { DataTable, ParseTree, TriangleTable } from '@tape-n-trace/ui'
import type { Step } from '@tape-n-trace/engine'
import type { Artifact } from '../lib/artifact'

export function ArtifactPanel({
  artifact,
  step,
}: {
  artifact: Artifact
  step: Step | null
}): React.JSX.Element | null {
  if (artifact.kind === 'none') return null

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ fontSize: 15, margin: 0 }}>{title(artifact)}</h2>
      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        {artifact.kind === 'table' ? (
          <DataTable
            columns={artifact.columns}
            rows={artifact.rows}
            step={step}
            caption={artifact.caption}
          />
        ) : artifact.kind === 'triangle' ? (
          <TriangleTable states={artifact.states} marks={artifact.marks} step={step} />
        ) : (
          <ParseTree nodes={artifact.nodes} step={step} />
        )}
      </div>
    </section>
  )
}

function title(artifact: Artifact): string {
  switch (artifact.kind) {
    case 'triangle':
      return 'Distinguishability table'
    case 'parseTree':
      return 'Parse tree'
    default:
      return 'Working'
  }
}
