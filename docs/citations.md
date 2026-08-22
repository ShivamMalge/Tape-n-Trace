# Citations

Every `Step.citation` the engine emits, checked against a printed copy of the
prescribed text rather than against memory.

**Baseline (ADR-005).** Hopcroft, Motwani & Ullman, *Introduction to Automata
Theory, Languages, and Computation*, **2nd edition**, Pearson. The BTOCH503
syllabus prescribes this edition, so its section and theorem numbers are the ones
students hold.

**The rule.** A citation is written only after the section has been read and
found to say what the code claims. Where the engine does something the text does
not, it cites the part it *does* perform and the module says so in its header. A
coarse citation is honest; a plausible one is not.

---

## Verified

| Cited | Section title (2e) | Page | Used by |
|---|---|---|---|
| 2.2.4 | Extending the Transition Function to Strings | 49 | `fa/simulate.ts` — DFA steps |
| 2.2.5 | The Language of a DFA | 52 | `fa/simulate.ts` — DFA verdict |
| 2.3.3 | The Extended Transition Function | 58 | `fa/simulate.ts` — NFA steps |
| 2.3.4 | The Language of an NFA | 59 | `fa/simulate.ts` — NFA verdict |
| 2.3.5 | Equivalence of Deterministic and Nondeterministic Finite Automata | 60 | `fa/subset.ts` |
| 2.3.5, Thm 2.11 | *L(D) = L(N)* for the subset construction | 63 | `fa/subset.ts` — summary |
| 2.3.6 | A Bad Case for the Subset Construction | 65 | `fa/subset.ts` — the 2^n stop |
| 2.5.3 | Epsilon-Closures | 75 | `fa/simulate.ts`, `fa/epsilon.ts` |
| 2.5.4 | Extended Transitions and Languages for ε-NFA's | 76 | `fa/simulate.ts` — ε-NFA steps |
| 2.5.5 | Eliminating ε-Transitions | 77 | `fa/subset.ts` — ε-NFA source |
| 3.1.3 | Precedence of Regular-Expression Operators | 88 | `regex/parse.ts` |
| 3.2.2 | Converting DFA's to Regular Expressions by Eliminating States | 96 | `regex/stateElim.ts` |
| 3.2.3 | Converting Regular Expressions to Automata | 101 | `regex/thompson.ts` |
| 3.2.3, Thm 3.7 | Every language of a regular expression is a language of a finite automaton | 102 | `regex/thompson.ts` — summary |
| 4.4.1 | Testing Equivalence of States | 154 | `fa/minimize.ts` — the marking rounds |
| 4.4.2 | Testing Equivalence of Regular Languages | 157 | `fa/equivalence.ts` |
| 4.4.3 | Minimization of DFA's | 159 | `fa/minimize.ts` — pruning and merging |
| 4.4.3, Thm 4.24 | Equivalent states partition the state set | 161 | `fa/minimize.ts` — the merge |
| 5.1.4 | Leftmost and Rightmost Derivations | 175 | `cfg/derive.ts` — each applied production |
| 5.2.3 | Inference, Derivations, and Parse Trees | 184 | `cfg/derive.ts` — the derivation ⟺ tree summary step |
| 6.1.4 | Instantaneous Descriptions of a PDA | 224 | `pda/simulate.ts` — every ID step; the (q, w, γ) triple and ⊢ are this section's notation |
| 6.2.2 | Acceptance by Empty Stack | 230 | `pda/gallery.ts` — the balanced-parentheses N(P) preset |
| 6.2.3, Thm 6.9 | From Empty Stack to Final State | 231 | `pda/acceptance.ts` — `emptyStackToFinalState`; rules (1)–(3) implemented as printed |
| 6.2.4, Thm 6.11 | From Final State to Empty Stack | 234 | `pda/acceptance.ts` — `finalStateToEmptyStack`; the drain state and per-symbol pops are rules (3)–(4) on p. 235 |
| 6.3.1, Thm 6.13 | From Grammars to Pushdown Automata | 237, 239 | `pda/fromCFG.ts` — the one-state construction, δ(q, ε, A) and δ(q, a, a) exactly as printed |
| 6.4.1 | Definition of a Deterministic PDA | 247 | `pda/determinism.ts` — the two conditions are checked verbatim; `pda/gallery.ts` wcwᴿ |

Figure-level, verified:

| Figure | What it is | Used by |
|---|---|---|
| Fig. 2.4 | DFA accepting all strings with substring 01 | `fa/gallery.ts` — see the note below |
| Fig. 2.9 | NFA accepting strings ending in 01 | `fa/gallery.ts` — `nfaEndsIn01` |
| Fig. 2.15 | NFA with no equivalent DFA under 2^n states | `test/conversions.test.ts` — the exponential case |
| Fig. 3.16, 3.17 | Basis and induction of the ε-NFA construction | `regex/thompson.ts` |
| Fig. 6.2 (Example 6.2) | The wwᴿ PDA as a transition diagram, p. 224 | `pda/gallery.ts` — `wwr`, arc for arc |
| Fig. 6.11 (Example 6.16) | The deterministic wcwᴿ PDA, p. 248 | `pda/gallery.ts` — `wcwr`, arc for arc |

---

## Corrections made during verification

Six citations were wrong and are fixed. All were plausible, which is
exactly why they survived until someone opened the book.

| Module | Was | Is | Why |
|---|---|---|---|
| `pda/acceptance.ts` | 6.2.3, Thm 6.11 | 6.2.3, **Thm 6.9** | Empty stack → final state is Theorem 6.9 (p. 231). 6.11 was written from memory and belongs to the other direction. |
| `pda/acceptance.ts` | 6.2.4, Thm 6.14 | 6.2.4, **Thm 6.11** | Final state → empty stack is Theorem 6.11 (p. 234). There is no Theorem 6.14 in this chapter's conversions at all. |
| `fa/equivalence.ts` | 4.1.1 / 4.1.2 | 4.4.2 | §4.1 is **Proving Languages not to be Regular** — the pumping lemma. Equivalence of two machines is §4.4.2. |
| `fa/minimize.ts` | 4.4.2, Thm 4.24 | 4.4.3, Thm 4.24 | The theorem number was right; §4.4.2 is the *equivalence* test, and the merge belongs to §4.4.3. |
| `regex/stateElim.ts` | 3.2.2, Thm 3.4 | 3.2.2 | Theorem 3.4 belongs to §3.2.1, which **this scheme explicitly excludes** ("3.2 except 3.2.1"). Pointing a student there is worse than pointing nowhere. |
| `fa/epsilon.ts` | 2.5.5, Thm 2.22 | 2.5.3 | §2.5.5 eliminates ε by going straight to a **DFA**, and Thm 2.22 is about ε-NFAs and DFAs. This module produces an ε-free **NFA**, which the text does not carry. |

---

## Deliberate divergences

Places the engine does something the prescribed text does not. Each is a choice,
recorded here so it is not mistaken for an error later.

**ε-NFA to NFA** (`fa/epsilon.ts`). Hopcroft removes ε-transitions and
determinises in one procedure (§2.5.5). The engine splits them, because the two
are examined separately and one combined step hides which half does what. The
combined construction still exists, in `fa/subset.ts`, and cites §2.5.5 properly.

**Equivalence by product construction** (`fa/equivalence.ts`). §4.4.2 pools both
machines' states and runs table filling. That returns a yes or a no; walking the
product breadth-first returns the **shortest separating string**, which is the
thing worth showing a student. Table filling is still implemented, in
`fa/minimize.ts`, where it is what the exam asks for.

---

## Uncited on purpose

**Regular grammars** (`fa/regularGrammar.ts`). Hopcroft 2e has no section on
them: Chapter 3 is regular expressions and Chapter 5 begins at context-free
grammars. The course does not examine them either — the syllabus lists only
Hopcroft sections, and the lesson plan, question bank and all three model papers
contain no reference to regular, right-linear or linear grammars.

The module is therefore **enrichment under ADR-003**: demoted, not deleted. It
carries no citation. The syllabus's own reference texts (Linz; Mishra &
Chandrasekaran) do cover the topic, but no section number is claimed for either,
because neither has been checked against a printed copy.

---

## A known cosmetic difference

`fa/gallery.ts`'s `dfaContains01` is the machine of **Fig. 2.4**, with `q1` and
`q2` exchanged: the book's accepting state is `q1`, the preset's is `q2`. The
language, the structure and the number of states are identical. Left as it is
rather than relabelled, because the preset is referenced by name across the test
suite and the trade is churn against a cosmetic gain — but it is recorded here so
a student comparing the screen to the page is not left wondering, and so the
entry claims §2.2 rather than Fig. 2.4.
