/**
 * The exercise bank — one list, all modules.
 *
 * The invariants a CI test enforces on this list (phases.md P1.1): at least 60
 * exercises; every module of the default scheme represented; every topic id
 * known to the topic graph; marks, bloom and co on every entry; and every
 * auto-graded exercise's reference passing its own grader.
 */

import type { Exercise } from '../../lib/exercises'
import { MODULE1 } from './module1'
import { MODULE2 } from './module2'
import { GENERATED } from './generated'
import { THEORY } from './theory'

export const EXERCISES: Exercise[] = [...MODULE1, ...GENERATED, ...MODULE2, ...THEORY]

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id)
}
