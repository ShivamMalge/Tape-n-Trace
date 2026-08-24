'use client'

/**
 * The Turing-machine gallery page: the chapter 8 machines, run one at a time,
 * each with the programming technique it demonstrates explained beside it.
 */

import { useState } from 'react'
import { TM_PRESETS, type Technique, type TmPreset } from '@tape-n-trace/engine'
import { TmRunner } from './tm-runner'

const TECHNIQUE_NOTES: Record<Technique, { title: string; body: string; citation: string }> = {
  basic: {
    title: 'The basic model',
    body: 'One tape, one head, a finite control. Every move writes a symbol, moves the head one cell, and changes state — a stationary head is not allowed (§8.2.2). The machine accepts by entering an accepting state and dies when no move applies.',
    citation: '§8.2',
  },
  function: {
    title: 'Computing a function',
    body: 'Turing’s original view: integers in unary (or binary) on the tape, and the machine halts with the answer where the input was. The accepting state here only marks the halt; what matters is what is left on the tape.',
    citation: '§8.2.4, Example 8.4',
  },
  storage: {
    title: 'Storage in the state',
    body: 'The finite control holds a data element beside the control state: the state is written [q, A]. Nothing is added to the model — [q1, 0] is just a state named with a pair — but the program reads as “remember the first symbol, then check it never recurs”.',
    citation: '§8.3.1, Example 8.6',
  },
  tracks: {
    title: 'Multiple tracks',
    body: 'A tape symbol is a tuple, one component per track; here a check-mark track over the data track, written mark|symbol. Again only a way of reading the symbols: the machine is still a one-tape machine.',
    citation: '§8.3.2, Example 8.7',
  },
  subroutine: {
    title: 'Subroutines',
    body: 'A set of states with an entry state and a return state that has no moves of its own. The “call” is a transition into the entry state; the “return” is whatever the caller does from the return state. Called from several places, the subroutine is copied with fresh state names.',
    citation: '§8.3.3, Example 8.8',
  },
  multitape: {
    title: 'Several tapes',
    body: 'Each tape has its own head; a move reads all of them, writes all of them, and may move each head left, right or — on a multitape machine only — not at all. No more languages are accepted (Theorem 8.9), but far fewer moves may be needed (Theorem 8.10).',
    citation: '§8.4.1',
  },
  nondeterministic: {
    title: 'Nondeterminism',
    body: 'δ(q, X) is a set of moves. The input is accepted if some sequence of choices reaches an accepting state. A deterministic machine can simulate it by keeping a queue of IDs and exploring them breadth first — exactly the tree drawn here (Theorem 8.11).',
    citation: '§8.4.4',
  },
  'busy-beaver': {
    title: 'Busy beavers',
    body: 'Among all n-state machines that halt on a blank tape, the one that writes the most 1s. The counts are known only for tiny n — which is the undecidability of halting, felt in a concrete way.',
    citation: '§8.2.6',
  },
}

const GROUPS: { title: string; techniques: Technique[] }[] = [
  { title: 'The basic model', techniques: ['basic', 'function'] },
  { title: 'Programming techniques (§8.3)', techniques: ['storage', 'tracks', 'subroutine'] },
  { title: 'Extensions (§8.4)', techniques: ['multitape', 'nondeterministic'] },
  { title: 'Halting (§8.2.6)', techniques: ['busy-beaver'] },
]

export function TmWorkbench({ initialId = 'zeros-ones' }: { initialId?: string }): React.JSX.Element {
  const [presetId, setPresetId] = useState(initialId)
  const preset = (TM_PRESETS.find((p) => p.id === presetId) ?? TM_PRESETS[0]) as TmPreset
  const note = TECHNIQUE_NOTES[preset.technique]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="Machines">
        {GROUPS.map((group) => (
          <div key={group.title} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tnt-muted" style={{ fontSize: 12, minWidth: 190 }}>
              {group.title}:
            </span>
            {TM_PRESETS.filter((p) => group.techniques.includes(p.technique)).map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === preset.id}
                onClick={() => setPresetId(p.id)}
                style={{
                  fontSize: 13,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: p.id === preset.id ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
                  background: p.id === preset.id ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
                  color: 'var(--tnt-text)',
                  cursor: 'pointer',
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="tnt-card" style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 15 }}>{preset.title}</strong>
          <p style={{ margin: 0, fontSize: 14 }}>{preset.blurb}</p>
          <span className="tnt-muted" style={{ fontSize: 12 }}>
            Hopcroft 2e §{preset.citation}
          </span>
          {preset.nonHalting === undefined ? null : (
            <p role="note" style={{ margin: 0, fontSize: 13, padding: '6px 10px', borderLeft: '3px solid var(--tnt-marked)' }}>
              <strong>Does not halt</strong> on {preset.nonHalting.inputs}: {preset.nonHalting.why} The run is stopped at
              the move cap and says so; it is never reported as rejected.
            </p>
          )}
          {preset.subroutine === undefined ? null : (
            <details style={{ fontSize: 13 }}>
              <summary style={{ cursor: 'pointer' }}>
                Subroutine <strong>{preset.subroutine.name}</strong> — {preset.subroutine.states.length} states
              </summary>
              <p style={{ margin: '6px 0 0' }}>
                States {preset.subroutine.states.join(', ')}: entered at {preset.subroutine.states[0]}, returning
                through {preset.subroutine.states.at(-1)}, which has no moves of its own. Inside it the tape panel says
                so.
              </p>
            </details>
          )}
        </div>
        <div className="tnt-card" style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 14 }}>{note.title}</strong>
          <p style={{ margin: 0, fontSize: 14 }}>{note.body}</p>
          <span className="tnt-muted" style={{ fontSize: 12 }}>
            {note.citation}
          </span>
        </div>
      </div>

      <TmRunner
        key={preset.id}
        machine={preset.machine}
        suggested={preset.suggested}
        encodeInput={preset.encodeInput}
        trackSeparator={preset.technique === 'tracks' ? '|' : undefined}
        subroutine={preset.subroutine}
      />
    </div>
  )
}
