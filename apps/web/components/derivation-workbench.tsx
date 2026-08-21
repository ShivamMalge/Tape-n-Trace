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
    <div style={{ display: 'grid', gap: 16 }}>
      <GrammarInput onGrammar={onGrammar} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            Derive this string
          </span>
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            style={{
              fontFamily: 'var(--tnt-mono)',
              fontSize: 16,
              padding: '7px 9px',
              borderRadius: 'var(--tnt-radius)',
              border: '1px solid var(--tnt-border)',
              background: 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              minWidth: 200,
            }}
          />
        </label>

        <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13 }}>
          <span className="tnt-muted">Mode</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as 'leftmost' | 'rightmost')}
            style={{
              fontFamily: 'var(--tnt-font)',
              fontSize: 14,
              padding: '5px 8px',
              borderRadius: 'var(--tnt-radius)',
              border: '1px solid var(--tnt-border)',
              background: 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
            }}
          >
            <option value="leftmost">leftmost</option>
            <option value="rightmost">rightmost</option>
          </select>
        </label>

        <button
          type="button"
          onClick={run}
          disabled={grammar === null}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-current)',
            background: 'var(--tnt-current)',
            color: '#fff',
            fontSize: 14,
            cursor: grammar === null ? 'not-allowed' : 'pointer',
            opacity: grammar === null ? 0.5 : 1,
          }}
        >
          Derive
        </button>
      </div>

      <ValidationErrors errors={outcome.errors} />

      {outcome.trace?.result.type === 'incomplete' ? (
        <p role="status" style={{ margin: 0, fontSize: 14, color: 'var(--tnt-marked)' }}>
          {outcome.trace.result.reason} That is a bound, not a verdict.
        </p>
      ) : null}

      {outcome.trace !== null && snapshot !== undefined ? (
        <>
          <section style={{ display: 'grid', gap: 6 }}>
            <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Sentential form
            </h2>
            <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {snapshot.input.length === 0 ? (
                <span className="tnt-muted" style={{ fontSize: 14 }}>
                  ε — the empty string
                </span>
              ) : (
                snapshot.input.map((token, i) => (
                  <span
                    key={i}
                    data-lit={litPositions.has(i) ? 'true' : undefined}
                    style={{
                      fontFamily: 'var(--tnt-mono)',
                      fontSize: 16,
                      padding: '3px 8px',
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

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <section style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Productions
              </h2>
              <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
                <ProductionList grammar={snapshot.grammar} litIndices={lit} />
              </div>
            </section>

            <section style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Parse tree
              </h2>
              <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
                <ParseTree nodes={toRenderTree(snapshot.nodes)} step={step} />
              </div>
              <p className="tnt-muted" style={{ margin: 0, fontSize: 13, fontFamily: 'var(--tnt-mono)' }}>
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
