/**
 * Scope a stylesheet under one class, so anywidget's CSS injection cannot
 * restyle the host notebook — the Pratyaksha lesson phases-vyakarana.md V1
 * names. `:root` becomes the container itself; every other selector is
 * prefixed as a descendant; attribute-only selectors (the dark-theme hook)
 * match both on the container and on an ancestor; @keyframes bodies are left
 * alone.
 *
 * A small character-level scanner rather than a line matcher: a rule may sit
 * on one line (`.a { x: 1; }`), a selector list may span several lines, and a
 * declaration value may end in a comma — none of which a per-line rewrite can
 * tell apart.
 */

export const SCOPE = '.vyakarana-container'

// At-rules whose block holds further rules (their selectors need scoping).
const GROUPING = /^@(media|supports|container|layer|document|scope|starting-style)\b/i

export function scopeCss(source, scope = SCOPE) {
  let out = ''
  let prelude = ''
  // Each open block: 'rules' (holds rules) or 'verbatim' (declarations,
  // @keyframes, @font-face — copied through untouched).
  const stack = []
  let i = 0
  const n = source.length

  const inRules = () => stack.length === 0 || stack[stack.length - 1] === 'rules'

  while (i < n) {
    const ch = source[i]

    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      const comment = source.slice(i, stop)
      if (!inRules()) out += comment
      else if (prelude.trim() === '') {
        out += prelude + comment
        prelude = ''
      }
      // A comment inside a selector is dropped.
      i = stop
      continue
    }

    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < n && source[j] !== ch) j += source[j] === '\\' ? 2 : 1
      const text = source.slice(i, Math.min(j + 1, n))
      if (inRules()) prelude += text
      else out += text
      i = j + 1
      continue
    }

    if (!inRules()) {
      if (ch === '{') stack.push('verbatim')
      else if (ch === '}') stack.pop()
      out += ch
      i += 1
      continue
    }

    if (ch === '{') {
      const lead = prelude.match(/^\s*/)[0]
      const head = prelude.trim()
      if (head.startsWith('@')) {
        out += prelude + ch
        stack.push(GROUPING.test(head) ? 'rules' : 'verbatim')
      } else {
        const trail = prelude.slice(lead.length + prelude.trim().length).match(/^\s*/)[0]
        const scoped = splitTopLevel(head, ',')
          .map((part) => scopeSelector(part.replace(/\s+/g, ' ').trim(), scope))
          .join(', ')
        out += lead + scoped + (trail === '' ? ' ' : trail) + ch
        stack.push('verbatim')
      }
      prelude = ''
    } else if (ch === '}') {
      out += prelude + ch
      prelude = ''
      stack.pop()
    } else if (ch === ';' && prelude.trim().startsWith('@')) {
      // A statement at-rule: @import, @charset, @layer a, b;
      out += prelude + ch
      prelude = ''
    } else {
      prelude += ch
    }
    i += 1
  }
  return out + prelude
}

/** Split on `sep` outside parentheses, brackets and quotes. */
function splitTopLevel(text, sep) {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(' || ch === '[') depth += 1
    else if (ch === ')' || ch === ']') depth -= 1
    else if (ch === sep && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** The first compound selector (up to a top-level combinator) and the rest. */
function firstCompound(selector) {
  let depth = 0
  let quote = null
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(' || ch === '[') depth += 1
    else if (ch === ')' || ch === ']') depth -= 1
    else if (depth === 0 && /[\s>+~]/.test(ch)) return [selector.slice(0, i), selector.slice(i)]
  }
  return [selector, '']
}

function scopeSelector(selector, scope) {
  if (selector.startsWith(scope)) return selector
  const [compound, rest] = firstCompound(selector)
  // :root / html / body, alone or compounded (`:root:not([data-x])`), become
  // the container itself.
  const root = compound.match(/^(:root|html|body)(?![\w-])/)
  if (root) return `${scope}${compound.slice(root[1].length)}${rest}`
  // An attribute-only compound is a theme hook: it may sit on the container
  // or on any ancestor of it.
  if (compound.startsWith('[')) return `${scope}${compound}${rest}, ${compound} ${scope}${rest}`
  return `${scope} ${selector}`
}
