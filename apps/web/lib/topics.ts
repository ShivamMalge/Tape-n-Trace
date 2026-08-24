/**
 * The scheme-independent topic graph — architecture.md §8.
 *
 * A topic is a thing a student learns, the sections of the prescribed text that
 * carry it, and the page that teaches it. What it is *not* is a module number:
 * a module is where one particular university's scheme puts a topic, and two
 * schemes may put it in different places. That mapping lives in `schemes/`, and
 * `moduleOf` is how the rest of the app asks for it.
 *
 * Two invariants, both held by tests rather than by care:
 *
 * - Every exercise's `topic` names an entry here (`test/exercises.test.tsx`).
 * - Every topic the default scheme places resolves to a route that exists
 *   (`test/syllabus.test.tsx`), so the syllabus index can never link into
 *   nothing.
 */

export interface Topic {
  id: string
  title: string
  /**
   * Hopcroft 2e sections, as the syllabus prints them. Empty where the topic is
   * examined but the prescribed text does not carry it — left recursion is a
   * parsing topic, and the hierarchy map is a synthesis rather than a section.
   */
  sections: string[]
  /** The page that teaches it. Checked against the app's real routes in CI. */
  href: string
}

export const TOPICS: Topic[] = [
  { id: 'fa.basics', title: 'Alphabets, strings and languages', sections: ['1.1', '1.5'], href: '/learn/strings' },
  { id: 'fa.dfa', title: 'Deterministic finite automata', sections: ['2.2'], href: '/simulate' },
  { id: 'fa.nfa', title: 'Nondeterministic finite automata', sections: ['2.3'], href: '/simulate' },
  { id: 'fa.enfa', title: 'ε-NFAs and ε-closure', sections: ['2.5'], href: '/simulate' },
  { id: 'fa.subset', title: 'The subset construction', sections: ['2.3.5'], href: '/convert/nfa-to-dfa' },
  { id: 'fa.text-search', title: 'Text search', sections: ['2.4'], href: '/search' },

  { id: 'regex.basics', title: 'Regular expressions', sections: ['3.1', '3.3'], href: '/regex' },
  { id: 'regex.to-nfa', title: 'RE to ε-NFA (Thompson)', sections: ['3.2.3'], href: '/regex' },
  { id: 'regex.from-dfa', title: 'DFA to RE (state elimination)', sections: ['3.2.2'], href: '/convert/dfa-to-re' },
  { id: 'fa.minimize', title: 'DFA minimisation', sections: ['4.4'], href: '/convert/minimize' },
  { id: 'regular.closure', title: 'Closure properties of regular languages', sections: ['4.2'], href: '/closure' },
  { id: 'regular.pumping', title: 'The pumping lemma', sections: ['4.1'], href: '/prove/pumping' },

  { id: 'cfg.basics', title: 'Context-free grammars', sections: ['5.1'], href: '/grammar' },
  { id: 'cfg.derivations', title: 'Derivations and parse trees', sections: ['5.2'], href: '/grammar' },
  { id: 'cfg.ambiguity', title: 'Ambiguity', sections: ['5.4'], href: '/grammar/ambiguity' },
  { id: 'cfg.left-recursion', title: 'Left recursion elimination', sections: [], href: '/grammar/left-recursion' },
  { id: 'pda.basics', title: 'Pushdown automata', sections: ['6.1', '6.2'], href: '/simulate/pda' },
  { id: 'pda.acceptance', title: 'Final state and empty stack', sections: ['6.2.3', '6.2.4'], href: '/convert/pda-acceptance' },
  { id: 'pda.cfg', title: 'Equivalence of PDAs and CFGs', sections: ['6.3.1'], href: '/convert/cfg-to-pda' },
  { id: 'pda.deterministic', title: 'Deterministic PDAs', sections: ['6.4'], href: '/edit/pda' },

  { id: 'cfg.simplify', title: 'Grammar simplification', sections: ['7.1'], href: '/grammar/simplify' },
  { id: 'cfg.cnf', title: 'Chomsky normal form', sections: ['7.1.5'], href: '/grammar/simplify' },
  { id: 'cfl.pumping', title: 'The pumping lemma for CFLs', sections: ['7.2'], href: '/prove/pumping' },
  { id: 'cfl.closure', title: 'Closure properties of CFLs', sections: ['7.3'], href: '/closure/cfl' },

  { id: 'undecidability.basics', title: 'Problems computers cannot solve', sections: ['8.1'], href: '/undecidable' },
  { id: 'tm.basics', title: 'Turing machines', sections: ['8.2'], href: '/simulate/tm' },
  { id: 'tm.techniques', title: 'Programming techniques for TMs', sections: ['8.3'], href: '/simulate/tm' },
  { id: 'tm.multitape', title: 'Multitape and nondeterministic TMs', sections: ['8.4'], href: '/convert/tm-multitape' },
  {
    id: 'undecidability.diagonalization',
    title: 'A language that is not recursively enumerable',
    sections: ['9.1'],
    href: '/undecidable/diagonalization',
  },
  {
    id: 'undecidability.recursive',
    title: 'Recursive languages and their complements',
    sections: ['9.2.1', '9.2.2'],
    href: '/undecidable',
  },
  {
    id: 'undecidability.universal',
    title: 'The universal language, and why it is undecidable',
    sections: ['9.2.3', '9.2.4'],
    href: '/undecidable',
  },
  {
    id: 'undecidability.reduction',
    title: 'Reducing one problem to another',
    sections: ['8.1.3'],
    href: '/undecidable/reduction',
  },
  { id: 'hierarchy', title: 'Classifying a language', sections: [], href: '/hierarchy' },
]

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === id)
}
