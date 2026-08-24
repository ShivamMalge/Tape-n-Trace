/**
 * The scheme layer — architecture.md §8.
 *
 * One default, and however many others the repository carries. Everything that
 * needs to know "which module is this in?" asks `moduleOf` rather than reading
 * a field off a topic, because the answer belongs to a scheme.
 */

import { TOPICS, topicById, type Topic } from '../topics'
import { ATRIA_2026_BTOCH503 } from './atria-2026-btoch503'
import { VTU_2022_BCS503 } from './vtu-2022-bcs503'
import type { Scheme, SchemeModule } from './types'

export type { CourseOutcome, Scheme, SchemeModule, TutorialComponent } from './types'
export { ATRIA_2026_BTOCH503, VTU_2022_BCS503 }

export const SCHEMES: Scheme[] = [ATRIA_2026_BTOCH503, VTU_2022_BCS503]

/** BTOCH503 — phases.md §2. */
export const DEFAULT_SCHEME: Scheme = ATRIA_2026_BTOCH503

export function schemeById(id: string): Scheme | undefined {
  return SCHEMES.find((scheme) => scheme.id === id)
}

/** The module a topic lands in, under a given scheme. */
export function moduleOf(topicId: string, scheme: Scheme = DEFAULT_SCHEME): number | undefined {
  return scheme.modules.find((m) => m.topics.includes(topicId))?.number
}

/** The module a topic lands in, with its full record. */
export function moduleForTopic(topicId: string, scheme: Scheme = DEFAULT_SCHEME): SchemeModule | undefined {
  return scheme.modules.find((m) => m.topics.includes(topicId))
}

/** Every topic a module places, resolved. A topic id with no entry is dropped; a test forbids one. */
export function topicsOf(module: SchemeModule): Topic[] {
  return module.topics.flatMap((id) => {
    const topic = topicById(id)
    return topic === undefined ? [] : [topic]
  })
}

/** The topics a scheme places, in module order. */
export function scheduledTopics(scheme: Scheme = DEFAULT_SCHEME): Topic[] {
  return scheme.modules.flatMap(topicsOf)
}

/** Topics in the graph that the scheme does not place — enrichment, under ADR-003. */
export function unscheduledTopics(scheme: Scheme = DEFAULT_SCHEME): Topic[] {
  const placed = new Set(scheme.modules.flatMap((m) => m.topics))
  return TOPICS.filter((topic) => !placed.has(topic.id))
}

/** The topics whose page is `href`, under a given scheme. Drives the breadcrumb. */
export function topicsForHref(href: string, scheme: Scheme = DEFAULT_SCHEME): Topic[] {
  const placed = new Set(scheme.modules.flatMap((m) => m.topics))
  return TOPICS.filter((topic) => topic.href === href && placed.has(topic.id))
}
