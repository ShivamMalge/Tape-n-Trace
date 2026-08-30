/**
 * Scope a stylesheet under one class, so anywidget's CSS injection cannot
 * restyle the host notebook — the Pratyaksha lesson phases-vyakarana.md V1
 * names. `:root` becomes the container itself; every other selector is
 * prefixed as a descendant; attribute-only selectors (the dark-theme hook)
 * match both on the container and on an ancestor; @keyframes bodies are left
 * alone.
 */

export const SCOPE = '.vyakarana-container'

export function scopeCss(source, scope = SCOPE) {
  const out = []
  let keyframesDepth = null
  let depth = 0

  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length

    if (keyframesDepth !== null) {
      out.push(line)
      depth += opens - closes
      if (depth <= keyframesDepth) keyframesDepth = null
      continue
    }

    if (trimmed.endsWith('{')) {
      const selector = trimmed.slice(0, -1).trim()
      if (selector.startsWith('@keyframes')) {
        keyframesDepth = depth
        out.push(line)
      } else if (selector.startsWith('@')) {
        out.push(line)
      } else {
        const scoped = selector
          .split(',')
          .map((part) => scopeSelector(part.trim(), scope))
          .join(', ')
        out.push(line.slice(0, line.indexOf(trimmed)) + scoped + ' {')
      }
    } else {
      out.push(line)
    }
    depth += opens - closes
  }
  return out.join('\n')
}

function scopeSelector(selector, scope) {
  if (selector === ':root' || selector === 'html' || selector === 'body') return scope
  if (selector.startsWith(scope)) return selector
  if (selector.startsWith('[')) return `${scope}${selector}, ${selector} ${scope}`
  return `${scope} ${selector}`
}
