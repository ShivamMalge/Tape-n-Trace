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
| 7.1.1, Thm 7.2 | Eliminating Useless Symbols | 256–257 | `cfg/useless.ts` — non-generating first, then unreachable; `wrongOrderUseless` is Example 7.1 |
| 7.1.2, Thms 7.4, 7.6 | Computing the Generating and Reachable Symbols | 258–259 | `cfg/useless.ts` — both inductions |
| 7.1.3, Thms 7.7, 7.9 | Eliminating ε-Productions | 259–261 | `cfg/epsilonProd.ts` — nullable induction; the 2^m versions minus the all-absent one; L(G₁) = L(G) − {ε} |
| 7.1.4, Thms 7.11, 7.13 | Eliminating Unit Productions | 262–265 | `cfg/unitProd.ts` — unit pairs by the basis/induction, then A → α for every pair (A, B) and non-unit B → α |
| 7.1, Thm 7.14 | The safe order: ε-productions, unit productions, useless symbols | 266 | `simplify-pipeline.tsx` — the stage order, and the docs card |
| 7.1.5, Thm 7.16 | Chomsky Normal Form | 266–268 | `cfg/cnf.ts` — terminal isolation, then binarisation with one cascade per distinct body |
| 7.2.2, Thm 7.18 | Statement of the Pumping Lemma (for CFLs) | 275 | `pumping/cfl.ts`; the closure lab's non-closure card |
| 7.3.1, Thm 7.23 | Substitutions | 282–283 | `cfg/closure.ts` — `cflSubstitution`, variables renamed apart |
| 7.3.2, Thm 7.24 | Applications of the Substitution Theorem | 284–285 | `cfg/closure.ts` — union, concatenation, closure, homomorphism |
| 7.3.3, Thm 7.25 | Reversal | 285 | `cfg/closure.ts` — every body reversed |
| 7.3.4, Thm 7.27 | Intersection With a Regular Language | 286–287 | `cfg/closure.ts` — the PDA × FA product, states (q, p) |
| 7.3.4, Thm 7.29 | L − R is a CFL; complement and difference need not be | 289 | the closure lab's non-closure card |
| 7.3.5, Thm 7.30 | Inverse Homomorphism | 290–291 | `cfg/closure.ts` — the buffer construction, states (q, x) |
| 8.2.2 | Notation for the Turing Machine | 318–319 | `tm/simulate.ts` — the 7-tuple; a single-tape head must move (L or R), enforced by `validateTM` |
| 8.2.3 | Instantaneous Descriptions for Turing Machines | 320–321 | `tm/simulate.ts` — every move's narration; `tapeIdText` implements the four blank-handling exceptions as printed |
| 8.2.4 | Transition Diagrams for Turing Machines | 323 | `lib/tm-drawable.ts` — arcs labelled X/Y → and X/Y ← |
| 8.2.5–8.2.6 | The Language of a Turing Machine; Turing Machines and Halting | 326–327 | `tm/simulate.ts` — accept on entering F, halt when δ is undefined; the move cap reports `incomplete`, never rejection |
| 8.3.1–8.3.3 | Storage in the State; Multiple Tracks; Subroutines | 330–335 | `tm/gallery.ts` — Examples 8.6, 8.7 and 8.8 as presets; the page's technique cards |
| 8.4.1 | Multitape Turing Machines | 336–337 | `tm/simulate.ts` — one read, write and move per tape; S allowed only here |
| 8.4.2, Thm 8.9 | Equivalence of One-Tape and Multitape TM's | 337–338 | `tm/multitape.ts` — `multitapeToSingle`, the 2k-track machine with head markers, built and run |
| 8.4.3, Thm 8.10 | Running Time and the Many-Tapes-to-One Construction | 339–340 | `tm/multitape.ts` — `simulateReduction` counts N's moves against 4n + 2k; asserted in the tests |
| 8.4.4, Thm 8.11 | Nondeterministic Turing Machines | 340–342 | `tm/simulate.ts` — the breadth-first tree of IDs; the page's nondeterminism card |
| 8.1.1–8.1.2 | Programs that Print "Hello, World"; The Hypothetical "Hello, World" Tester | 308–313 | `undecidable/reduction.ts` — the hello-world problem, with H₂'s paradox as its reason for being undecidable |
| 8.1.3 | Reducing One Problem to Another | 313–316 | `undecidable/reduction.ts` — Fig. 8.7's construct-then-decide chain; Example 8.1's four-step construction, instruction for instruction; the box on p. 316 is what `REDUCTION_DIRECTION` refuses |
| 8.1.4 | Exercises for Section 8.1 | 316 | `undecidable/reduction.ts` — Exercise 8.1.1(a) halting and (b) any output, both reduced from hello-world |
| 9.1.1 | Enumerating the Binary Strings | 369 | `undecidable/encoding.ts` — `binaryString` and `stringIndex`; "treat 1w as a binary integer i" implemented as printed |
| 9.1.2 | Codes for Turing Machines | 369–370 | `undecidable/encoding.ts` — q₁ the start and q₂ the sole accepting state, X₁X₂X₃ = 0, 1, B, D₁D₂ = L, R; the rule code 0ⁱ10ʲ10ᵏ10ˡ10ᵐ; C₁11C₂⋯11C_n; the pair (M, w) separated by 111 |
| 9.1.3 | The Diagonalization Language | 370–372 | `undecidable/diagonal.ts` — L_d; an ill-formed code read as the one-state machine with no moves. The footnote on p. 371 — "the top rows of the table are in fact solid 0's" — is why the page has presets rather than starting at row 1 and stopping there |
| 9.1.4, Thm 9.2 | Proof that L_d is not Recursively Enumerable | 372 | `undecidable/diagonal.ts` — `diagonalArgument`, walked over the computed table |
| 9.2.1 | Recursive Languages | 373 | `hierarchy.ts` — a problem is decidable exactly when its language is recursive |
| 9.2.2, Thms 9.3, 9.4 | Complements of Recursive and RE languages | 374–377 | `hierarchy.ts` — the complement row of the closure table, and the nine placements of p. 377 of which four survive |
| 9.2.3 | The Universal Language | 377–379 | `hierarchy.ts`, `undecidable/reduction.ts` — L_u is RE because the universal machine accepts it |
| 9.2.4, Thm 9.6 | Undecidability of the Universal Language | 379–381 | `undecidable/reduction.ts` — L_u is RE but not recursive; the box on p. 380 defines H(M) and places the halting problem; the paragraph above Thm 9.6 is why a reduction's conclusion depends on its source |
| 9.2.5 | Exercises for Section 9.2 | 381–382 | `undecidable/reduction.ts` — Exercise 9.2.1 (halting ⇄ L_u); `hierarchy.ts` — Exercise 9.2.6 (closure), see the divergence below |

Figure-level, verified:

| Figure | What it is | Used by |
|---|---|---|
| Fig. 2.4 | DFA accepting all strings with substring 01 | `fa/gallery.ts` — see the note below |
| Fig. 2.9 | NFA accepting strings ending in 01 | `fa/gallery.ts` — `nfaEndsIn01` |
| Fig. 2.15 | NFA with no equivalent DFA under 2^n states | `test/conversions.test.ts` — the exponential case |
| Fig. 3.16, 3.17 | Basis and induction of the ε-NFA construction | `regex/thompson.ts` |
| Fig. 6.2 (Example 6.2) | The wwᴿ PDA as a transition diagram, p. 224 | `pda/gallery.ts` — `wwr`, arc for arc |
| Fig. 6.11 (Example 6.16) | The deterministic wcwᴿ PDA, p. 248 | `pda/gallery.ts` — `wcwr`, arc for arc |
| Fig. 8.7 | If we could solve problem P₂, then we could use its solution to solve P₁, p. 314 | `reduction-builder.tsx` — the boxes and the dashed "Decide" diamond |
| Fig. 9.1 | The table that represents acceptance of strings by Turing machines, p. 371 | `undecidable/diagonal.ts`, `diagonal-grid.tsx` |
| Fig. 9.2 | Relationship between the recursive, RE, and non-RE languages, p. 374 | `hierarchy.ts`; drawn by `hierarchy-rings.tsx` on `/undecidable` and extended inwards on `/hierarchy` |
| Fig. 9.3 | Construction of a TM accepting the complement of a recursive language, p. 376 | `hierarchy.ts` — the complement row's construction |
| Fig. 9.4 | Simulation of two TM's accepting a language and its complement, p. 376 | `hierarchy.ts` — the parallel simulation the union and intersection rows reuse |
| Fig. 9.6 | Reduction of L_d to the complement of L_u, p. 380 | `undecidable/reduction.ts` — the Copy box producing w111w |
| Example 7.1 | S → AB \| a, A → b: the wrong-order trap, p. 256 | `test/cfl.test.ts`, and the pipeline page's preset (with B → Bb so the text form can state B) |
| Example 7.8 | ε-elimination worked through, p. 260 | `test/cfl.test.ts` — the output grammar asserted exactly |
| Examples 7.10, 7.12, Fig. 7.1 | Unit pairs and the rewritten expression grammar, pp. 263–265 | `test/cfl.test.ts` — ten pairs and four production sets asserted exactly |
| Example 7.15, Fig. 7.3 | The expression grammar in CNF, pp. 267–268 | `test/cfl.test.ts` — fifteen variables, three cascades, language equivalence |
| Example 7.22 | Substitution into {01}, p. 282 | `test/cfl.test.ts`, the closure lab's substitution demo |
| Example 7.26 | L₁ = {0ⁿ1ⁿ2ⁱ}, L₂ = {0ⁱ1ⁿ2ⁿ}, p. 285 | `cfg/closure.ts` — `CFL_INTERSECTION_DEMO`, letters renamed (see below) |
| Fig. 8.9, Example 8.2 | The 0ⁿ1ⁿ machine and its ID sequence on 0011, pp. 321–323 | `tm/gallery.ts` — `zeros-ones`; `test/tm.test.ts` asserts both printed ID sequences character for character |
| Fig. 8.11, Example 8.4 | Proper subtraction, p. 325 | `tm/gallery.ts` — `monus`, verbatim; q6 marked accepting so the halt reads as one |
| Example 8.6 | Storage in the state, 01* + 10*, pp. 330–331 | `tm/gallery.ts` — `storage-in-state`, states named [q, A] |
| Example 8.7 | L_wcw with a check-mark track, pp. 331–333 | `tm/gallery.ts` — `tracks`, rules 1–14 generated as printed |
| Figs. 8.14–8.15, Example 8.8 | Copy, and the multiplication program that calls it, pp. 334–335 | `tm/gallery.ts` — `copy` (with a q₀ walking over the leading 1) and `multiply` |
| Exercise 8.2.3 | Binary increment on $N, halting on the leftmost digit of N+1, p. 328 | `tm/gallery.ts` — `binary-increment`, built to the exercise's stated IDs |
| Exercise 8.4.2 | A nondeterministic machine, p. 342 | `tm/gallery.ts` — `ntm`, verbatim |

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

**Example 7.26 over a, b, c** (`cfg/closure.ts`). The book's grammars are over
0, 1, 2. They are carried over a, b, c so the intersection is literally the
pumping game's `abc-equal` preset, and the page says so. The grammars are
otherwise the book's, production for production.

**The pipeline's stage order** (`simplify-pipeline.tsx`). phases.md lists the
four modules in the book's order of exposition (useless symbols first). The page
runs Theorem 7.14's order of execution — ε-productions, unit productions,
useless symbols, CNF — because the exposition order is precisely the trap the
phase exists to teach.

**Copy's leading state** (`tm/gallery.ts`). Fig. 8.14's Copy begins to the right
of a 1 the multiplication program has already passed. Run on its own it needs
one more state, q₀, that walks over that 1; the five states of the book's
subroutine are otherwise verbatim and are the ones the page boxes.

**Multitape IDs.** The book gives no ID notation for multitape machines
(§8.4.1 says so). The engine writes one tape's ID per part, separated by ‖,
with the state before the scanned cell on every tape.

**Example 9.1's code, read where it could be read** (`undecidable/encoding.ts`).
The scan of p. 370 renders the long digit strings at a size where they cannot be
counted digit by digit with any confidence, and a code is nothing but digits.
The first three of the four rule codes were read and match the engine's output
character for character. The fourth and the joined code were **not** transcribed:
they follow from the coding scheme §9.1.2 states in prose — δ(q₃, X₃) = (q₂, X₂,
D₁) is 0³10³10²10²10¹ — which the three legible ones confirm. The test says so at
the assertion rather than claiming a transcription it does not have.

**A code that repeats a (state, symbol) pair** (`undecidable/encoding.ts`).
§9.1.2 codes δ, which is a function, so a well-formed code lists each pair once.
The text does not say what a code that repeats one means. The engine reads it as
ill-formed, and so as §9.1.3's machine with no moves. The empty string is treated
the same way, on the same reasoning — a code lists at least one transition. Both
choices are invisible in the table, because either reading gives L(Mᵢ) = ∅ for
every index a window can reach; they are reachable only by typing a code by hand.

**Exercise 9.2.6's answers** (`hierarchy.ts`). The closure table for the
recursive and RE languages has one row the book proves — complementation, by
Theorems 9.3 and 9.4 — and six it sets as Exercise 9.2.6 without printing
solutions. Those six are worked here, and every one of them is labelled
*exercise* in the data, in the table and in the panel that opens beneath it. The
citation points at the exercise that asks the question, never at a theorem that
answers it.

**A square table with two origins** (`undecidable/diagonal.ts`). Fig. 9.1 is
drawn with its rows and columns starting together, and the engine defaults to
that, because cell (i, i) is the whole point. It also allows them to start apart,
which the printed figure never needs to. Computing the cells forces the question:
the first well-formed code is w₆₈₂ and the first machine that accepts anything is
M₁₃₅₄, while the columns worth reading are ε, 0, 1, 00 — so held together, a
window is either solid 0s or full of inputs hundreds of bits long. The table says
which kind of window it is, and the page says when the diagonal is off screen.

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

**Context-sensitive languages** (`hierarchy.ts`). The ring between the
context-free and the recursive languages carries `citation: null`, and the page
says in words that the prescribed sections do not cover it. Hopcroft 2e's listed
sections contain no linear bounded automaton and no context-sensitive grammar.
The ring is on the map because the syllabus's own tutorial component — "Language
Classification (Regular, CFL, CSL, Recursive, RE)" — names the class, and a
student told to expect five classes should not find four with a gap where the
fifth was. It is the one ring on the map with nowhere to read about it, and
saying so is the point.

Its outer boundary is unwitnessed for the same reason. Every other containment on
the map is shown proper by a language a student can name and a proof they are
examined on; recursive-but-not-context-sensitive languages exist by a diagonal
argument over the linear bounded automata, which is not in scope, and no
memorable example is standard. The ring is drawn empty and the map says why,
rather than borrowing a language that does not belong there.

**VTU's course outcomes** (`lib/schemes/vtu-2022-bcs503.ts`). The second scheme
ships with an empty outcome list. phases.md §2 records the section list as
confirmed identical to BTOCH503's, and it is shared rather than copied; it also
records that the *outcomes* differ, and no VTU document in this repository has
been read to establish their wording. Every exercise in the bank carries a CO
tag, so five plausible-looking outcomes would mislabel the whole question bank
while appearing complete. The syllabus page prints the reason where the outcomes
would be.

---

## A known cosmetic difference

`fa/gallery.ts`'s `dfaContains01` is the machine of **Fig. 2.4**, with `q1` and
`q2` exchanged: the book's accepting state is `q1`, the preset's is `q2`. The
language, the structure and the number of states are identical. Left as it is
rather than relabelled, because the preset is referenced by name across the test
suite and the trade is churn against a cosmetic gain — but it is recorded here so
a student comparing the screen to the page is not left wondering, and so the
entry claims §2.2 rather than Fig. 2.4.
