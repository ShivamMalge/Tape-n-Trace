# Build Phases — UI Overhaul and the Classroom Board

> **Status: U1–U3 closed 2026-08-31; U4 (the board) next.** The design is `Tape-n-Trace UIoverhaul/Tape-n-Trace.dc.html`
> (nine artboards, one component system, two themes) plus the board-mode feature phases.md §5 records.
> This tracker exists so the design lands artboard by artboard, each one checked against its source
> before the next begins — not as one sweep that gets the palette right and the details wrong.

Companion documents: [phases.md](phases.md) §5 (board mode) · [architecture.md](architecture.md) §10 (renderers, tokens) · the design file above

---

## 1. Rules

1. **The artboard is the spec.** Every phase names the artboard(s) it implements and the design file
   line range. "Looks close" is not a criterion; a value that differs from the artboard is a defect
   unless the note beside the criterion says why.
2. **Tokens before components, components before pages.** Nothing is styled inline that a token or a
   primitive class already states. The count of inline style objects may not go up.
3. **The notebook widget ships these styles too** (architecture.md §10.2). Every change to
   `packages/ui` is rebuilt into `vyakarana/static/` in the same commit, and `bridge/test/css-scope`
   stays green.
4. **Do not start phase N+1 while a criterion of phase N is unmet.** The gate is binary.
5. Existing tests describe the old UI in a few places (the verb-grouped rail). They are updated in the
   same commit as the structure they describe, with the reason in the test.

**Status legend:** ✅ done and pushed · 🔨 in progress · ⬜ not started

---

## 2. Tracker

| Phase | Artboards | Ships | Status | Notes |
|---|---|---|---|---|
| U1 Foundation | 00 System, 06 Dark | tokens, fonts, primitives, top bar + module panel, Home catalog | ✅ | 2026-08-31 · screenshots of Home in both themes checked against artboards 01 and 06 |
| U2 Simulator pattern | 02 Simulator, 02b Mobile, 06 Dark | diagram hero, tape card, transport bar, narration / ID / verdict / docs column; TM page first, then FA and PDA | ✅ | 2026-08-31 · TM checked in both themes and at 390 px; FA and PDA in light |
| U3 Conversion, Practice, Pumping | 03, 04, 05 | source/target cards + subset table; exercise + counterexample panel; adversary round + written proof | ✅ | 2026-08-31 · all three checked by screenshot in light |
| U4 Classroom board | 07 Board mode | `/board`: ink → states and arcs, chip labels, live δ, simulate panel | ⬜ | phases.md §5 |
| U5 Sweep | all | every remaining route on the system; inline-style count down; a11y pass; screenshots beside artboards | ⬜ | |

---

## 3. Phases

### U1 — Foundation · artboards 00 and 06

**Deliverables**

- `packages/ui/src/tokens.css`: the design palette in oklch (five roles: current/blue, accepting/green,
  dead/red, marked/amber, new/purple), paper surfaces, warm dark theme; three type families with one
  job each.
- Fonts: Spectral, IBM Plex Sans, IBM Plex Mono self-hosted via `next/font`, published as `--font-*`
  so `tokens.css` can name them without the widget depending on them.
- `packages/ui/src/primitives.css`: buttons (ink primary, bordered secondary, ghost), chips, verb tags
  (five, per `TAGCOLORS`), segmented control, verdict banner (three states, never two), docs card,
  stat counter, mono editor frame with inline error row.
- Chrome: the side rail becomes the design's top bar — tape glyph, wordmark, five-module segmented
  nav with a module panel strip, Practice, ⌘K search pill. `NAV` regroups by module; `Tool.verb` becomes
  a tag on every card.
- Home: hero ("instruments for one course"), stat pair, three-column catalog of verb-tagged cards.

**Acceptance criteria**

- [x] Every colour in artboard 00's swatch row and artboard 06's dark surface appears in `tokens.css`
      as a token; no component introduces a colour literal.
      *(The five roles each carry a soft, border and deep step; the verdict banner lost its inline colours.
      One literal remains by design: the segmented control's 7% ink shadow, which is the artboard's own value.)*
- [x] `pnpm typecheck`, `pnpm lint`, the web suite, `bridge test` and `check-fresh` are green.
      *(203 web tests; 7 bridge tests; static/ rebuilt with the new tokens, widget.css 9.2 KB.)*
- [x] Home renders the hero, the stat pair and every live tool as a card with its verb tag and module.
      *(26 cards; the count is computed from CATALOG and the hero spells it.)*
- [x] The five module buttons open the panel strip with the design's title, blurb and links.
      *(Home opens on Module 1 as the artboard does; `aria-expanded` is the styling hook.)*
- [x] Dark mode is the artboard-06 palette, not an inversion.
      *(Warm hue-70 surfaces, roles brightened per the artboard; a top-bar theme switch and `?theme=` were added
      because the design ships two themes and the choice needs a control.)*

### U2 — The simulator pattern · artboards 02, 02b, 06

- [x] `/simulate/tm`: breadcrumb bar with the language on the right; input row with Try chips; diagram
      card with the current-state ring; tape card with the head-fixed / tape-fixed segmented control,
      head marker above and state label below the cell; transport card (◀ Play ▶, scrub, step label,
      speed); right column of Narration, ID sequence with Copy, verdict banner, docs card.
      *(Screenshots with `?input=0011` in light and dark against artboards 02 and 06. Two deviations, recorded:
      the page keeps its h1 and lead above the picker — the artboard's breadcrumb-only header would drop the
      only visible page title — and the language sits in the derived syllabus breadcrumb rather than a
      hand-written one. `?machine=` and `?input=` were added so a lecturer can link to a loaded run.)*
- [x] The same pattern on `/simulate` and `/simulate/pda`.
      *(AutomatonController and PdaRunner take an `aside` of docs cards; the FA index is a card grid.)*
- [x] At 390 px the page stacks as artboard 02b, transport pinned at the bottom.
      *(Screenshot at 390 px; the transport is `position: sticky; bottom: 0` under 620 px with the scrub above the buttons as the artboard has it.)*

### U3 — Conversion, Practice, Pumping · artboards 03, 04, 05

- [x] NFA → DFA: source card (fixed), target card (blue border, "n of m states"), subset table with the
      current row tinted, narration beside a compact transport.
      *(The pane is titled "Result · DFA" rather than the artboard's "Target · DFA": the conversion test
      suite names the pane by that word and the noun is the one every conversion's result banner uses.
      Diagrams no longer scale past 1.5× their own geometry — the artboard's circles are r = 26 at ~1×.)*
- [x] Practice: exercise card with the marks · CO · level tag, "Your machine" card, the red
      "Not equivalent" panel with the shortest disagreement in a mono well, stat row, docs card.
      *(The task title is derived from the exercise's kind and alphabet; hints are the docs card. The
      editor canvas gained a minimum view box so a one-state machine sits in a working area.)*
- [x] Pumping: engine move 1 card, your move 2 card with the x / y / z split and sliders, the amber move-3
      banner, the proof card with Copy.
      *(Every move of the round is a card, engine or you, the verdict a banner — green when the round is won.
      The x / y / z segments underline y in the current colour as the artboard does.)*

### U4 — The classroom board · artboard 07 · phases.md §5

- [ ] Freehand strokes on the dark dotted board: a closed stroke becomes a state, a stroke between two
      states an arc, a stroke from a state to itself a loop; the raw ink shows while drawing and the
      recognised shape replaces it with the "stroke → state · named qᵢ" badge.
- [ ] Labels come from the chip picker (the alphabet plus ε), never from handwriting recognition.
- [ ] Undo / redo, "mark accepting", the states · arcs counter pill.
- [ ] Simulate slides the panel in: the δ table grows as the machine does; input with Try chips;
      ◀ Play ▶ walks the engine's trace with the current states lit on the board.
- [ ] The machine the board builds is the engine's `FiniteAutomaton`, validated by `validateFA`, and
      the run is `simulate` — no board-side automata logic.

### U5 — Sweep

- [ ] Every route reviewed against the system; no route keeps the old grey palette or system font.
- [ ] Inline style count below the pre-overhaul figure (951), measured by the same grep.
- [ ] Keyboard and screen-reader checks (§11.5) pass on the new chrome and the board.
