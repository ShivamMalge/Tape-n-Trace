/**
 * BCS503 — Theory of Computation, VTU 2022 scheme, semester V.
 *
 * The section list is identical to BTOCH503's — phases.md §2 records that as
 * confirmed against both the syllabus document and the module-wise textbook
 * extracts, whose filenames carry their own ranges. So the modules, the topics
 * and every scope decision are shared, and this file is the near-zero-cost
 * second scheme that phase promised.
 *
 * **What is not here.** VTU's course outcomes. phases.md §2 records that they
 * differ from BTOCH503's and sit at lower Bloom's levels, but their wording has
 * never been read off a VTU document, and every exercise in the bank carries a
 * CO tag. Inventing five plausible outcomes would mislabel the entire question
 * bank while looking complete, so the list is empty and the page says why.
 */

import { ATRIA_2026_BTOCH503 } from './atria-2026-btoch503'
import type { Scheme } from './types'

export const VTU_2022_BCS503: Scheme = {
  id: 'vtu-2022-bcs503',
  code: 'BCS503',
  title: 'Theory of Computation',
  institution: 'Visvesvaraya Technological University',
  session: '2022 scheme',
  credits: 3,
  ltps: [40, 0, 0, 0],
  textbook: 'Hopcroft, Motwani & Ullman, Introduction to Automata Theory, Languages, and Computation, 2nd edition, Pearson',
  // Identical, and shared rather than copied so the two cannot drift apart.
  modules: ATRIA_2026_BTOCH503.modules.map((module) => ({ ...module, co: '' })),
  outcomes: [],
  outcomesNote:
    'VTU’s course outcomes for BCS503 are not reproduced here. They differ from BTOCH503’s, and no VTU document in this repository has been read to confirm their wording — so the CO column is blank rather than guessed. The module and section lists below *are* confirmed identical to BTOCH503’s.',
  tutorials: [],
  discrepancies: [
    'The L:T:P:S hours follow the 2022 scheme’s 40 lecture hours; BTOCH503 allocates 42 lecture hours and 56 self-study hours.',
  ],
}
