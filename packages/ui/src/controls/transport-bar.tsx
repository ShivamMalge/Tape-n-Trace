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
      className={className === undefined ? 'tnt-transport' : `tnt-transport ${className}`}
      role="toolbar"
      aria-label="Trace transport"
      onKeyDown={onKeyDown}
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
        className="tnt-transport-scrub"
      />

      <span aria-hidden="true" className="tnt-transport-count">
        {stepCount === 0 ? '—' : `${stepIndex + 1} / ${stepCount}`}
      </span>

      <label className="tnt-field-row tnt-row-tight">
        <span className="tnt-muted">Speed</span>
        <select
          value={speed}
          disabled={inert}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          aria-label="Playback speed"
          className="tnt-select"
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
      className={`tnt-btn tnt-btn-icon${primary ? ' tnt-btn-primary' : ''}`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
