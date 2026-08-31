/**
 * The transport bar — design artboard 02: ◀ · Play · ▶, the scrub with
 * "Step i of n" beneath it, and a speed slider with its multiplier.
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
  /** The compact form (artboard 03's conversion stepper): no speed control. */
  compact?: boolean
}

export const SPEED_MIN = 0.5
export const SPEED_MAX = 4
export const SPEED_STEP = 0.5
/** Kept for callers that offer a fixed menu of speeds. */
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
  compact = false,
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

  const stepLabel = stepCount === 0 ? 'No run yet' : `Step ${stepIndex} of ${lastIndex}`

  return (
    <div
      className={`tnt-transport${compact ? ' tnt-transport-compact' : ''}${className === undefined ? '' : ` ${className}`}`}
      role="toolbar"
      aria-label="Trace transport"
      onKeyDown={onKeyDown}
    >
      <div className="tnt-transport-buttons">
        <Button label="Previous step" onClick={() => go(stepIndex - 1)} disabled={inert || atStart}>
          ◀
        </Button>
        <button
          type="button"
          onClick={() => onPlayingChange(!playing)}
          disabled={inert || (atEnd && !playing)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="tnt-btn tnt-btn-primary tnt-transport-play"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <Button label="Next step" onClick={() => go(stepIndex + 1)} disabled={inert || atEnd}>
          ▶
        </Button>
      </div>

      <div className="tnt-transport-scrub-wrap">
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
          {stepLabel}
        </span>
      </div>

      {compact ? null : (
        <label className="tnt-transport-speed">
          <span className="tnt-transport-speed-label">Speed</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            value={speed}
            disabled={inert}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            aria-label="Playback speed"
            aria-valuetext={`${speed.toFixed(1)}×`}
            className="tnt-transport-speed-range"
          />
          <span aria-hidden="true" className="tnt-transport-speed-value">
            {speed.toFixed(1)}×
          </span>
        </label>
      )}
    </div>
  )
}

interface ButtonProps {
  label: string
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}

function Button({ label, onClick, disabled, children }: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="tnt-btn tnt-btn-icon"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
