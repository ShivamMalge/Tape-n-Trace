'use client'

/**
 * The derivation stepper — phases.md P1.3.
 *
 * Type a grammar and a target string; the engine finds a leftmost or rightmost
 * derivation and replays it: the sentential form as a token strip, the applied
 * production lit in the grammar, and the parse tree growing one node per step
 * with its yield underneath — the §5.2 correspondence, watched.
 */

import { useCallback, useMemo, useState } from 'react'
import { deriveString, isOk, tokenise, treeYield } from '@tape-n-trace/engine'
import type { CFG, CfgTreeNode, DeriveSnapshot, Trace, ValidationError } from '@tape-n-trace/engine'
import { ParseTree, TransportBar } from '@tape-n-trace/ui'
import type { ParseTreeNode } from '@tape-n-trace/ui'
import { GrammarInput, ProductionList } from './grammar-input'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { usePlayback } from '../lib/use-playback'

/** CFG tree nodes drawn by the shared ParseTree renderer. */
export function toRenderTree(nodes: readonly CfgTreeNode[]): ParseTreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    op: 'symbol',
    label: node.symbol,
    children: node.children,
    parent: node.parent,
  }))
}

export function DerivationWorkbench(): React.JSX.Element {
  const [grammar, setGrammar] = useState<CFG | null>(null)
  const [target, setTarget] = useState('aabb')
  const [mode, setMode] = useState<'leftmost' | 'rightmost'>('leftmost')
  const [outcome, setOutcome] = useState<{ trace: Trace | null; errors: ValidationError[] }>({
    trace: null,
    errors: [],
  })

  const onGrammar = useCallback((next: CFG | null) => {
    setGrammar(next)
    setOutcome({ trace: null, errors: [] })
  }, [])

  const run = (): void => {
    if (grammar === null) return
    const tokens = /\s/.test(target.trim()) ? tokenise(target, true) : tokenise(target, false)
    const result = deriveString(grammar, target.trim() === '' ? [] : tokens, mode)
    setOutcome(
      isOk(result) ? { trace: result.value as Trace, errors: [] } : { trace: null, errors: result.errors },
    )
  }

  const playback = usePlayback(outcome.trace)
  const step = outcome.trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot as DeriveSnapshot | undefined

  const lit = useMemo(() => {
    const set = new Set<number>()
    for (const h of step?.highlight ?? []) {
      if (h.type === 'production') set.add(h.index)
    }
    return set
  }, [step])

  const litPositions = useMemo(() => {
    const set = new Set<number>()
    for (const h of step?.highlight ?? []) {
      if (h.type === 'input') set.add(h.position)
    }
    return set
  }, [step])

  return (
    <div className="tnt-stack">
      <GrammarInput onGrammar={onGrammar} />

      <div className="tnt-row tnt-row-end">
        <label className="tnt-field">
          <span className="tnt-muted">
            Derive this string
          </span>
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="tnt-input tnt-input-mono"
            style={{ minWidth: 200 }}
          />
        </label>

        <label className="tnt-field-row">
          <span className="tnt-muted">Mode</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as 'leftmost' | 'rightmost')}
            className="tnt-input"
          >
            <option value="leftmost">leftmost</option>
            <option value="rightmost">rightmost</option>
          </select>
        </label>

        <button type="button" className="tnt-btn tnt-btn-primary" onClick={run} disabled={grammar === null}>
          Derive
        </button>
      </div>

      <ValidationErrors errors={outcome.errors} />

      {outcome.trace?.result.type === 'incomplete' ? (
        <p role="status" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
          {outcome.trace.result.reason} That is a bound, not a verdict.
        </p>
      ) : null}

      {outcome.trace !== null && snapshot !== undefined ? (
        <>
          <section className="tnt-stack-sm">
            <h2 className="tnt-label" style={{ margin: 0 }}>
              Sentential form
            </h2>
            <div className="tnt-card tnt-row tnt-row-tight tnt-card-plain">
              {snapshot.input.length === 0 ? (
                <span className="tnt-muted">
                  ε — the empty string
                </span>
              ) : (
                snapshot.input.map((token, i) => (
                  <span
                    key={i}
                    className="tnt-mono tnt-lg"
                    data-lit={litPositions.has(i) ? 'true' : undefined}
                    style={{
                      padding: 'var(--tnt-space-1) var(--tnt-space-2)',
                      borderRadius: 'var(--tnt-radius)',
                      border: `1px solid ${litPositions.has(i) ? 'var(--tnt-current)' : 'var(--tnt-border)'}`,
                      background: litPositions.has(i)
                        ? 'var(--tnt-current-soft)'
                        : snapshot.grammar.variables.includes(token)
                          ? 'var(--tnt-surface)'
                          : 'var(--tnt-bg)',
                      fontStyle: snapshot.grammar.variables.includes(token) ? 'italic' : 'normal',
                    }}
                  >
                    {token}
                  </span>
                ))
              )}
            </div>
          </section>

          <div className="tnt-panels">
            <section className="tnt-stack-sm">
              <h2 className="tnt-label" style={{ margin: 0 }}>
                Productions
              </h2>
              <div className="tnt-card tnt-card-plain">
                <ProductionList grammar={snapshot.grammar} litIndices={lit} />
              </div>
            </section>

            <section className="tnt-stack-sm">
              <h2 className="tnt-label" style={{ margin: 0 }}>
                Parse tree
              </h2>
              <div className="tnt-card tnt-scroll-x tnt-card-plain">
                <ParseTree nodes={toRenderTree(snapshot.nodes)} step={step} />
              </div>
              <p className="tnt-sm tnt-muted tnt-mono" style={{ margin: 0 }}>
                yield: {treeYield(snapshot.nodes).join(' ') || 'ε'}
              </p>
            </section>
          </div>

          <TransportBar
            stepIndex={playback.stepIndex}
            stepCount={playback.stepCount}
            playing={playback.playing}
            speed={playback.speed}
            onStepChange={playback.setStepIndex}
            onPlayingChange={playback.setPlaying}
            onSpeedChange={playback.setSpeed}
            narration={step?.narration}
          />

          <NarrationPanel step={step} />
        </>
      ) : null}
    </div>
  )
}
