/**
 * The transport bar — play, pause, step, scrub, speed.
 *
 * Written once here and reused by every feature in the product, which is the
 * first thing the trace protocol buys (§5). Simulation, subset construction, CNF
 * conversion and the pumping game all produce a `Trace`, so all four are scrubbed
 * by this one component.
 *
 * Fully controlled and effect-free: the controller owns the step index and the
 * playback timer (§10.1). Nothing here runs a clock, which is also what stops
 * two features from drifting into two slightly different notions of "playing".
 */

export interface TransportBarProps {
  stepIndex: number
  stepCount: number
  playing: boolean
  /** Steps per second. */
  speed: number
  onStepChange: (index: number) => void
  onPlayingChange: (playing: boolean) => void
  onSpeedChange: (speed: number) => void
  /** The current step's narration, announced to screen readers as the value text. */
  narration?: string | undefined
  disabled?: boolean
  className?: string
}

export const SPEED_CHOICES = [0.5, 1, 2, 4] as const

export function TransportBar({
  stepIndex,
  stepCount,
  playing,
  speed,
  onStepChange,
  onPlayingChange,
  onSpeedChange,
  narration,
  disabled = false,
  className,
}: TransportBarProps): React.JSX.Element {
  const lastIndex = Math.max(0, stepCount - 1)
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= lastIndex
  const inert = disabled || stepCount === 0

  const go = (index: number): void => {
    onStepChange(Math.min(lastIndex, Math.max(0, index)))
  }

  /**
   * Keyboard control lives on the toolbar rather than the window: a global
   * listener would swallow the space bar while a student is typing an input
   * string, which is the kind of bug that makes a tool feel hostile.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (inert) return
    const actions: Record<string, () => void> = {
      ' ': () => onPlayingChange(!playing),
      ArrowRight: () => go(stepIndex + 1),
      ArrowLeft: () => go(stepIndex - 1),
      Home: () => go(0),
      End: () => go(lastIndex),
    }
    const action = actions[event.key]
    if (action === undefined) return
    event.preventDefault()
    action()
  }

  return (
    <div
      className={className}
      role="toolbar"
      aria-label="Trace transport"
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        border: '1px solid var(--tnt-border)',
        borderRadius: 'var(--tnt-radius)',
        background: 'var(--tnt-surface)',
        fontFamily: 'var(--tnt-font)',
        flexWrap: 'wrap',
      }}
    >
      <Button label="First step" onClick={() => go(0)} disabled={inert || atStart}>
        ⏮
      </Button>
      <Button label="Previous step" onClick={() => go(stepIndex - 1)} disabled={inert || atStart}>
        ⏪
      </Button>
      <Button
        label={playing ? 'Pause' : 'Play'}
        onClick={() => onPlayingChange(!playing)}
        disabled={inert || (atEnd && !playing)}
        primary
      >
        {playing ? '⏸' : '▶'}
      </Button>
      <Button label="Next step" onClick={() => go(stepIndex + 1)} disabled={inert || atEnd}>
        ⏩
      </Button>
      <Button label="Last step" onClick={() => go(lastIndex)} disabled={inert || atEnd}>
        ⏭
      </Button>

      <input
        type="range"
        min={0}
        max={lastIndex}
        step={1}
        value={Math.min(stepIndex, lastIndex)}
        disabled={inert}
        onChange={(event) => go(Number(event.target.value))}
        aria-label="Step"
        aria-valuetext={
          narration === undefined
            ? `Step ${stepIndex + 1} of ${stepCount}`
            : `Step ${stepIndex + 1} of ${stepCount}. ${narration}`
        }
        style={{ flex: '1 1 160px', minWidth: 120, accentColor: 'var(--tnt-current)' }}
      />

      <span
        aria-hidden="true"
        style={{
          fontFamily: 'var(--tnt-mono)',
          fontSize: 13,
          color: 'var(--tnt-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {stepCount === 0 ? '—' : `${stepIndex + 1} / ${stepCount}`}
      </span>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        <span style={{ color: 'var(--tnt-text-muted)' }}>Speed</span>
        <select
          value={speed}
          disabled={inert}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          aria-label="Playback speed"
          style={{
            fontFamily: 'var(--tnt-font)',
            fontSize: 13,
            padding: '2px 4px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
          }}
        >
          {SPEED_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}×
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

interface ButtonProps {
  label: string
  onClick: () => void
  disabled: boolean
  primary?: boolean
  children: React.ReactNode
}

function Button({ label, onClick, disabled, primary = false, children }: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        height: 30,
        borderRadius: 'var(--tnt-radius)',
        border: '1px solid var(--tnt-border)',
        background: primary ? 'var(--tnt-current)' : 'var(--tnt-bg)',
        color: primary ? '#ffffff' : 'var(--tnt-text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
