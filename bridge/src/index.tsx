/**
 * The anywidget entry — phases-vyakarana.md V1.
 *
 * anywidget calls `render({ model, el })`; this mounts the React viewer in a
 * `.vyakarana-container` (every style the bundle ships is scoped under that
 * class, so the host notebook's document is left alone), subscribes to the
 * four synced traits, and pushes step changes back through the model so
 * Python sees what the widget shows.
 */

import { createRoot } from 'react-dom/client'
import { readState, TRAITS, type AnyModel } from './model.js'
import { Viewer } from './viewer.js'

interface RenderProps {
  model: AnyModel
  el: HTMLElement
}

function render({ model, el }: RenderProps): () => void {
  const container = document.createElement('div')
  container.className = 'vyakarana-container'
  el.appendChild(container)
  const root = createRoot(container)

  const onStepChange = (step: number): void => {
    model.set('step', step)
    model.save_changes()
  }

  const draw = (): void => {
    const state = readState(model)
    root.render(<Viewer payload={state.payload} trace={state.trace} step={state.step} onStepChange={onStepChange} />)
  }

  const listeners: [string, () => void][] = TRAITS.map((trait) => [`change:${trait}`, draw])
  for (const [event, callback] of listeners) model.on(event, callback)
  draw()

  return () => {
    for (const [event, callback] of listeners) model.off?.(event, callback)
    root.unmount()
    container.remove()
  }
}

export default { render }
