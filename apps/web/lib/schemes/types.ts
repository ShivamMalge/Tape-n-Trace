/**
 * A scheme: one university's version of this course — architecture.md §8.
 *
 * The syllabus is data, not code. A scheme names the modules, the hours, the
 * sections as that university prints them, the course outcomes, and which
 * topics land in which module. Adding an institution is a file in this
 * directory; it is never a change to a page.
 *
 * The topic graph itself is shared (`lib/topics.ts`), because a topic is the
 * same thing everywhere. Only its *placement* differs.
 */

export interface CourseOutcome {
  /** CO1 … CO5. */
  id: string
  /** The outcome, in the words the syllabus document uses. */
  text: string
  /** Bloom's cognitive level, as the syllabus tags it. */
  level: number
}

export interface SchemeModule {
  number: 1 | 2 | 3 | 4 | 5
  title: string
  hours: number
  /** Sections as the syllabus prints them, including any exclusions. */
  sections: string
  /** The course outcome this module carries. */
  co: string
  /** Topic ids, in teaching order. Every one must exist in `TOPICS`. */
  topics: string[]
}

export interface TutorialComponent {
  title: string
  /** The topic whose page delivers it, or null where nothing does yet. */
  topic: string | null
  /** Said plainly when nothing delivers it. */
  note?: string
}

export interface Scheme {
  id: string
  /** The course code, as it appears on a transcript. */
  code: string
  title: string
  institution: string
  /** e.g. "AY 2026-27". */
  session: string
  credits: number
  /** Lecture : tutorial : practical : self-study, in hours. */
  ltps: [number, number, number, number]
  /** The prescribed text. */
  textbook: string
  modules: SchemeModule[]
  /**
   * May be empty, and is for any scheme whose outcomes have not been read off
   * that university's own document. `outcomesNote` then says so on the page.
   * Course outcomes drive CO tagging on every exercise, so a guessed one would
   * mislabel the whole question bank.
   */
  outcomes: CourseOutcome[]
  outcomesNote?: string
  tutorials: TutorialComponent[]
  /**
   * Where the source documents disagree with each other. Recorded rather than
   * silently resolved — phases.md §2 lists these, and a scheme that picked a
   * side without saying so would be hiding a known problem.
   */
  discrepancies: string[]
}
