'use client'

/**
 * The Turing-machine gallery page: the chapter 8 machines, run one at a time,
 * each with the programming technique it demonstrates explained beside it —
 * as docs cards in the runner's right column (design artboard 02).
 */

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { TM_PRESETS, type Technique, type TmPreset } from '@tape-n-trace/engine'
import { DocsCard } from './docs-card'
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
  // `?machine=` picks the preset and `?input=` opens it with a run loaded, so a
  // lecturer can link straight to Fig. 8.9 on 0011.
  const params = useSearchParams()
  const [presetId, setPresetId] = useState(params?.get('machine') ?? initialId)
  const initialInput = params?.get('input') ?? undefined
  const preset = (TM_PRESETS.find((p) => p.id === presetId) ?? TM_PRESETS[0]) as TmPreset
  const note = TECHNIQUE_NOTES[preset.technique]

  return (
    <div className="tnt-stack-lg">
      <div className="tnt-stack-sm" role="group" aria-label="Machines">
        {GROUPS.map((group) => (
          <div key={group.title} className="tnt-row">
            <span className="tnt-label tnt-picker-label">{group.title}</span>
            {TM_PRESETS.filter((p) => group.techniques.includes(p.technique)).map((p) => (
              <button
                key={p.id}
                type="button"
                className="tnt-chip tnt-chip-sans"
                aria-pressed={p.id === preset.id}
                onClick={() => setPresetId(p.id)}
              >
                {p.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      <TmRunner
        key={preset.id}
        machine={preset.machine}
        suggested={preset.suggested}
        encodeInput={preset.encodeInput}
        trackSeparator={preset.technique === 'tracks' ? '|' : undefined}
        subroutine={preset.subroutine}
        initialInput={initialInput}
        aside={
          <>
            <DocsCard title={preset.title} cite={`Hopcroft 2e §${preset.citation}`} open>
              <p>{preset.blurb}</p>
              {preset.nonHalting === undefined ? null : (
                <p role="note" className="tnt-note tnt-note-warn">
                  <strong>Does not halt</strong> on {preset.nonHalting.inputs}: {preset.nonHalting.why} The run is
                  stopped at the move cap and says so; it is never reported as rejected.
                </p>
              )}
              {preset.subroutine === undefined ? null : (
                <p>
                  Subroutine <strong>{preset.subroutine.name}</strong> — states {preset.subroutine.states.join(', ')}:
                  entered at {preset.subroutine.states[0]}, returning through {preset.subroutine.states.at(-1)}, which
                  has no moves of its own. Inside it the tape card says so.
                </p>
              )}
            </DocsCard>
            <DocsCard title={note.title} cite={note.citation}>
              {note.body}
            </DocsCard>
          </>
        }
      />
    </div>
  )
}
