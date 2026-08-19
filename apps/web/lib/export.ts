'use client'

/**
 * Export a machine or a trace.
 *
 * Assignments and activities are 25% of the course marks, so a student needs
 * something submittable; the alternative is a phone photo of a screen.
 *
 * Three formats, three jobs: `.tnt` is the machine itself and reopens here, SVG
 * goes into a report at any size, and PNG goes wherever a submission portal only
 * accepts images.
 */

import type { FiniteAutomaton, Trace } from '@tape-n-trace/engine'

/** The native format: the machine as JSON, with enough header to know what it is. */
export interface TntFile {
  format: 'tape-n-trace/machine@1'
  machine: FiniteAutomaton
  /** Present when a run was exported alongside the machine. */
  trace?: Trace
}

export function toTntJson(machine: FiniteAutomaton, trace?: Trace | null): string {
  const file: TntFile = {
    format: 'tape-n-trace/machine@1',
    machine,
    ...(trace === null || trace === undefined ? {} : { trace }),
  }
  return JSON.stringify(file, null, 2)
}

/** Read a `.tnt` file back, or explain why it is not one. */
export function parseTntJson(text: string): { machine: FiniteAutomaton } | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'That file is not valid JSON.' }
  }

  const file = parsed as Partial<TntFile>
  if (file.format !== 'tape-n-trace/machine@1') {
    return { error: 'That file is not a Tape-n-Trace machine — the format header is missing.' }
  }
  if (file.machine === undefined || !Array.isArray(file.machine.states)) {
    return { error: 'That file has a format header but no machine in it.' }
  }
  return { machine: file.machine }
}

/**
 * Serialise a live `<svg>` to a standalone file.
 *
 * The diagram is drawn entirely with CSS custom properties so it can follow the
 * page theme, and a detached SVG has no page to inherit them from — it would
 * open as black-on-black or invisible. So the tokens actually in use are
 * resolved against the live element and inlined.
 */
export function svgToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const computed = getComputedStyle(svg)

  const declarations = TOKENS.map((token) => `${token}: ${computed.getPropertyValue(token).trim()};`)
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `svg { ${declarations.join(' ')} background: var(--tnt-bg); }`
  clone.insertBefore(style, clone.firstChild)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.removeAttribute('width')
  const box = svg.viewBox.baseVal
  clone.setAttribute('width', String(Math.round(box.width)))
  clone.setAttribute('height', String(Math.round(box.height)))

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
}

const TOKENS = [
  '--tnt-bg',
  '--tnt-surface',
  '--tnt-border',
  '--tnt-text',
  '--tnt-text-muted',
  '--tnt-state-fill',
  '--tnt-state-stroke',
  '--tnt-edge',
  '--tnt-label',
  '--tnt-current',
  '--tnt-current-soft',
  '--tnt-accepting',
  '--tnt-accepting-soft',
  '--tnt-dead',
  '--tnt-dead-soft',
  '--tnt-new',
  '--tnt-taken',
  '--tnt-candidate',
  '--tnt-marked',
  '--tnt-mono',
  '--tnt-font',
]

/** Rasterise the SVG at `scale`× its natural size, for portals that want an image. */
export async function svgToPngBlob(svg: SVGSVGElement, scale = 2): Promise<Blob | null> {
  const box = svg.viewBox.baseVal
  const width = Math.round(box.width * scale)
  const height = Math.round(box.height * scale)

  const source = svgToString(svg)
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (context === null) return null

    // A transparent PNG dropped into a white document loses every light stroke,
    // so the background token is painted in rather than left clear.
    context.fillStyle = getComputedStyle(svg).getPropertyValue('--tnt-bg').trim() || '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('the diagram could not be rasterised'))
    image.src = url
  })
}

/** Hand a file to the browser's download flow. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filename: string, type: string): void {
  downloadBlob(new Blob([text], { type }), filename)
}

/** A filename safe on every platform, derived from what the machine is. */
export function suggestFilename(machine: FiniteAutomaton, extension: string): string {
  const kind = machine.kind.toLowerCase()
  return `${kind}-${machine.states.length}-states.${extension}`
}
