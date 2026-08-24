/**
 * BTOCH503 — Theory of Computation, Atria Institute of Technology
 * (autonomous), semester V, AY 2026-27. The default scheme.
 *
 * Source: `3.Pcc-ToC.docx`, which phases.md §2 treats as authoritative where the
 * course documents disagree. The disagreements themselves are recorded in
 * `discrepancies` rather than resolved in silence.
 */

import type { Scheme } from './types'

export const ATRIA_2026_BTOCH503: Scheme = {
  id: 'atria-2026-btoch503',
  code: 'BTOCH503',
  title: 'Theory of Computation',
  institution: 'Atria Institute of Technology (autonomous), Dept. of Information Science & Engineering',
  session: 'AY 2026–27',
  credits: 3,
  ltps: [42, 0, 0, 56],
  textbook: 'Hopcroft, Motwani & Ullman, Introduction to Automata Theory, Languages, and Computation, 2nd edition, Pearson',
  modules: [
    {
      number: 1,
      title: 'Finite automata',
      hours: 8,
      sections: '1.1, 1.5, 2.2, 2.3, 2.4, 2.5',
      co: 'CO1',
      topics: ['fa.basics', 'fa.dfa', 'fa.nfa', 'fa.enfa', 'fa.subset', 'fa.text-search'],
    },
    {
      number: 2,
      title: 'Regular expressions and languages',
      hours: 8,
      sections: '3.1, 3.2 (except 3.2.1), 3.3, 4.1, 4.2, 4.4',
      co: 'CO2',
      topics: ['regex.basics', 'regex.to-nfa', 'regex.from-dfa', 'regular.pumping', 'regular.closure', 'fa.minimize'],
    },
    {
      number: 3,
      title: 'Context-free grammars and pushdown automata',
      hours: 8,
      sections: '5.1, 5.2, 5.4, 6.1, 6.2, 6.3.1, 6.4',
      co: 'CO3',
      topics: [
        'cfg.basics',
        'cfg.derivations',
        'cfg.ambiguity',
        'cfg.left-recursion',
        'pda.basics',
        'pda.acceptance',
        'pda.cfg',
        'pda.deterministic',
      ],
    },
    {
      number: 4,
      title: 'Properties of context-free languages',
      hours: 8,
      sections: '7.1, 7.2, 7.3',
      co: 'CO4',
      topics: ['cfg.simplify', 'cfg.cnf', 'cfl.pumping', 'cfl.closure'],
    },
    {
      number: 5,
      title: 'Turing machines and undecidability',
      hours: 8,
      sections: '8.1, 8.2, 8.3, 8.4, 9.1, 9.2',
      co: 'CO5',
      topics: [
        'undecidability.basics',
        'tm.basics',
        'tm.techniques',
        'tm.multitape',
        'undecidability.diagonalization',
        'undecidability.recursive',
        'undecidability.universal',
        'undecidability.reduction',
        'hierarchy',
      ],
    },
  ],
  outcomes: [
    {
      id: 'CO1',
      text: 'Explain the concepts of finite automata, regular languages, context-free languages and Turing machines',
      level: 2,
    },
    {
      id: 'CO2',
      text: 'Apply automata theory principles to construct FA, RE, CFG, PDA and their equivalent models',
      level: 3,
    },
    {
      id: 'CO3',
      text: 'Analyze formal languages and computational models to determine language properties, automata equivalence, closure properties',
      level: 4,
    },
    {
      id: 'CO4',
      text: 'Analyze CFGs, PDAs and TMs to solve computational problems and distinguish classes of formal languages',
      level: 4,
    },
    {
      id: 'CO5',
      text: 'Analyze decidability, undecidability and computability to classify problems by solvability',
      level: 4,
    },
  ],
  tutorials: [
    { title: 'Lexical analyzer design using regular expressions', topic: 'regex.basics' },
    { title: 'Pattern matching and search engine simulation using finite automata', topic: 'fa.text-search' },
    { title: 'Balanced parentheses checker using pushdown automata', topic: 'pda.basics' },
    { title: 'Syntax validation of simple programming statements using CFGs', topic: 'cfg.derivations' },
    { title: 'String processing problems using Turing machine concepts', topic: 'tm.basics' },
    { title: 'Language classification (regular, CFL, CSL, recursive, RE)', topic: 'hierarchy' },
    {
      title: 'Automata simulation using the JFLAP tool',
      topic: null,
      note: 'Not built. JFLAP’s .jff import is scheduled after v1.0, and until it exists nothing here delivers this component.',
    },
  ],
  discrepancies: [
    'The lesson plan states 40 teaching hours; the syllabus document states 42. The syllabus is taken as authoritative.',
    'The lesson plan maps CO1 and CO2 across modules 1–4 and CO3 and CO4 across modules 3–4; the syllabus gives the clean one-to-one mapping shown here.',
    'The model question papers tag every sub-part CL2 or CL3, while the syllabus claims CL4 for CO3 to CO5.',
    'The departmental gap-analysis document still carries the older VTU code BCS503.',
  ],
}
