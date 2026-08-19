/**
 * Edge labels, as a student types them.
 *
 * The one place the ε glyph is translated. The engine stores epsilon as `null`
 * (ADR-002) and knows nothing about how it is written; the editor has to accept
 * everything a student might reasonably type for it, because the alternative is
 * a label that silently does nothing.
 */

import { EPSILON_GLYPH } from '@tape-n-trace/ui'
import type { Read } from '@tape-n-trace/engine'

/** Spellings of epsilon we accept on input. Lowercased before comparison. */
const EPSILON_SPELLINGS = new Set([EPSILON_GLYPH, 'e', 'eps', 'epsilon', 'lambda', 'λ', '^', 'ε'])

/**
 * Parse a comma-separated label into transition reads.
 *
 * "0, 1" gives two symbol transitions; "eps" or "ε" gives an ε-transition;
 * an empty string gives nothing, which deletes the edge.
 */
export function parseEdgeLabel(text: string): Read[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => (EPSILON_SPELLINGS.has(part.toLowerCase()) ? null : part))
}

/** Format reads back into an editable label. */
export function formatEdgeLabel(reads: readonly Read[]): string {
  return reads.map((read) => read ?? EPSILON_GLYPH).join(', ')
}

/** Whether a parsed label would introduce an ε-transition. */
export function containsEpsilon(reads: readonly Read[]): boolean {
  return reads.some((read) => read === null)
}
