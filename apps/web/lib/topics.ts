/**
 * The scheme-independent topic graph — architecture.md §8, arriving early.
 *
 * P1.7 builds the full syllabus layer; exercises need the ids now, because they
 * key on `TopicId` rather than a module number (the module is a property of the
 * *scheme*, not of the topic). A CI test walks every exercise and fails on a
 * topic this list does not carry, so a typo cannot ship.
 */

export interface Topic {
  id: string
  title: string
  /** Where the default scheme (BTOCH503) places it. */
  module: 1 | 2 | 3 | 4 | 5
}

export const TOPICS: Topic[] = [
  { id: 'fa.basics', title: 'Alphabets, strings and languages', module: 1 },
  { id: 'fa.dfa', title: 'Deterministic finite automata', module: 1 },
  { id: 'fa.nfa', title: 'Nondeterministic finite automata', module: 1 },
  { id: 'fa.enfa', title: 'ε-NFAs and ε-closure', module: 1 },
  { id: 'fa.subset', title: 'The subset construction', module: 1 },
  { id: 'fa.text-search', title: 'Text search', module: 1 },
  { id: 'regex.basics', title: 'Regular expressions', module: 2 },
  { id: 'regex.to-nfa', title: 'RE to ε-NFA (Thompson)', module: 2 },
  { id: 'regex.from-dfa', title: 'DFA to RE (state elimination)', module: 2 },
  { id: 'fa.minimize', title: 'DFA minimisation', module: 2 },
  { id: 'regular.closure', title: 'Closure properties of regular languages', module: 2 },
  { id: 'regular.pumping', title: 'The pumping lemma', module: 2 },
  { id: 'cfg.basics', title: 'Context-free grammars', module: 3 },
  { id: 'cfg.derivations', title: 'Derivations and parse trees', module: 3 },
  { id: 'cfg.ambiguity', title: 'Ambiguity', module: 3 },
  { id: 'cfg.left-recursion', title: 'Left recursion elimination', module: 3 },
  { id: 'pda.basics', title: 'Pushdown automata', module: 3 },
  { id: 'pda.cfg', title: 'Equivalence of PDAs and CFGs', module: 3 },
  { id: 'cfg.simplify', title: 'Grammar simplification', module: 4 },
  { id: 'cfg.cnf', title: 'Chomsky normal form', module: 4 },
  { id: 'cfl.pumping', title: 'The pumping lemma for CFLs', module: 4 },
  { id: 'cfl.closure', title: 'Closure properties of CFLs', module: 4 },
  { id: 'tm.basics', title: 'Turing machines', module: 5 },
  { id: 'tm.techniques', title: 'Programming techniques for TMs', module: 5 },
  { id: 'tm.multitape', title: 'Multitape Turing machines', module: 5 },
  { id: 'undecidability.basics', title: 'Undecidability', module: 5 },
]

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === id)
}
