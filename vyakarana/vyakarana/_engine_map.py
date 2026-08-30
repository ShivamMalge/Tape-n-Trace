"""The declarative binding map the API parity test walks — documentation.md §9.

`ENGINE_MAP` says which engine export stands behind every public member of
the Python surface (`None` = pure plumbing with no algorithm behind it).
`UNBOUND` accounts for every remaining engine export, each with the reason it
is not (yet) surfaced. The parity test fails on drift in either direction:
a Python method missing from the map, a mapped name missing from the engine
manifest, or an engine export in neither table.
"""

from __future__ import annotations

ENGINE_MAP: dict[str, str | None] = {
    # The shared machine surface — machines.py's base class
    "_Machine.accepts": "simulate",
    "_Machine.run": "simulate",
    "_Machine.run_all": "simulate",
    "_Machine.reverse": "reverseFA",
    "_Machine.equivalent_to": "areEquivalentDetailed",
    "_Machine.validate": "validateFA",
    "_Machine.export_trace": None,
    "_Machine.to_json": None,
    "_Machine.from_json": "validateFA",
    "_Machine.states": None,
    "_Machine.alphabet": None,
    "_Machine.kind": None,
    # DFA / NFA / ENFA — machines.py
    "DFA.kind": None,
    "NFA.kind": None,
    "ENFA.kind": None,
    "DFA.minimize": "minimize",
    "DFA.is_minimal": "minimize",
    "DFA.to_regex": "dfaToRegex",
    "DFA.complement": "complement",
    "DFA.completed": "completeDFA",
    "DFA.union": "unionFA",
    "DFA.intersection": "intersection",
    "DFA.difference": "difference",
    "NFA.to_dfa": "nfaToDfa",
    "NFA.epsilon_closure": "epsilonClosure",
    "NFA.remove_epsilon": "epsilonElim",
    "NFA.minimize": "minimize",
    "NFA.from_regex": "regexToENFA",
    "NFA.for_keywords": "keywordMachines",
    # RegularExpression — regular.py
    "RegularExpression.pattern": None,
    "RegularExpression.parse_tree": "parseRegex",
    "RegularExpression.to_enfa": "regexToENFA",
    "RegularExpression.to_dfa": "minimize",
    "RegularExpression.matches": "simulate",
    "RegularExpression.run": "simulate",
    "RegularExpression.playground": "regexToENFA",
    # CFG — cfg.py
    "CFG.from_text": "parseGrammar",
    "CFG.derive": "deriveString",
    "CFG.parse_tree": "deriveString",
    "CFG.is_ambiguous": "detectAmbiguity",
    "CFG.remove_epsilon": "eliminateEpsilon",
    "CFG.remove_unit": "eliminateUnit",
    "CFG.remove_useless": "eliminateUseless",
    "CFG.to_cnf": "toCNF",
    "CFG.to_pda": "cfgToPDA",
    "CFG.generates": "acceptsPDA",
    "CFG.sample": "generatedStrings",
    "CFG.to_text": "grammarToText",
    "CFG.export_trace": None,
    "CFG.variables": None,
    "CFG.terminals": None,
    "CFG.start": None,
    # PDA — pda.py
    "PDA.run": "simulatePDA",
    "PDA.accepts": "acceptsPDA",
    "PDA.to_empty_stack": "finalStateToEmptyStack",
    "PDA.to_final_state": "emptyStackToFinalState",
    "PDA.is_deterministic": "checkDeterminism",
    "PDA.to_cfg": None,  # enrichment refusal — ADR-003
    "PDA.validate": "validatePDA",
    "PDA.export_trace": None,
    "PDA.states": None,
    # TM — tm.py
    "TM.run": "simulateTM",
    "TM.accepts": "simulateTM",
    "TM.to_single_tape": "multitapeToSingle",
    "TM.tape_view": None,
    "TM.validate": "validateTM",
    "TM.export_trace": None,
    "TM.states": None,
    "TM.tapes": None,
    # Result objects — results.py
    "Simulation.accepted": None,
    "Simulation.trace": None,
    "Simulation.step": None,
    "Simulation.stopped": None,
    "Simulation.continue_for": None,
    "Simulation.id_log": "idLog",
    "Simulation.export_trace": None,
    "EquivalenceResult.equivalent": None,
    "EquivalenceResult.witness": None,
    "EquivalenceResult.side": None,
    "EquivalenceResult.compare": "simulate",
    "ParseTree.root": None,
    "ParseTree.yield_": "treeYield",
    "Derivation.derived": None,
    "Derivation.steps": None,
    "Derivation.trace": None,
    "Derivation.parse_tree": None,
    "Derivation.export_trace": None,
    "Ambiguous.witness": None,
    "Ambiguous.tree_a": None,
    "Ambiguous.tree_b": None,
    "DeterminismResult.deterministic": None,
    "DeterminismResult.violations": None,
    # Modules
    "gallery.all_machines": "TM_PRESETS",
}


def _group(reason: str, names: str) -> dict[str, str]:
    return {name: reason for name in names.split()}


UNBOUND: dict[str, str] = {
    **_group(
        "runtime plumbing the binding uses internally or has no user-facing story for",
        "ok err isOk isErr unwrap allOf mapResult validationError EngineInvariantError TraceBuilder "
        "deepFreeze serialise deserialise LIMITS ENGINE_VERSION isEpsilon",
    ),
    **_group(
        "used internally by the Python surface (behind a mapped method)",
        "tmIdLog cfgToPDA_unused_placeholder".replace("cfgToPDA_unused_placeholder", "simulateReduction"),
    ),
    **_group(
        "canonical-naming helpers; Python replicates the id formats and the parity of the formats is test-asserted",
        "faTransitionId pdaTransitionId tmTransitionId productStateName subsetStateName parseSubsetStateName "
        "compareStateIds sortStateIds canonicalRenaming freshStateId primedName nextStateName pairKey",
    ),
    **_group(
        "the web editor's structural operations; a notebook builds machines from literals",
        "addState addTransition removeState removeTransition renameState moveState applyLayout "
        "setAlphabet setEdgeLabels setKind setStart toggleAccepting emptyMachine",
    ),
    **_group(
        "web-app content and presets (the TM gallery is surfaced via vyakarana.gallery)",
        "APPLIED appliedCase GALLERY galleryEntry dfaContains01 nfaEndsIn01 nfaEvenZerosOrEndsIn1 "
        "enfaZerosThenOnes divisibleBy PDA_PRESETS pdaPreset tmPreset",
    ),
    **_group(
        "the pumping-lemma game engine — a web experience; a notebook variant is a 0.2 candidate",
        "PUMPING_LANGUAGES pumpingLanguage PUMP_I_BOUND adversarySplit allSplits checkPump pumped "
        "failingIndices truePumpingLength defenderSplit engineAttackIndex engineAttackWord "
        "cflAdversarySplit allCflSplits cflCheckPump cflPumped advance startSession sessionTrace proofParagraph",
    ),
    **_group(
        "CFL closure constructions — a 0.2 surface (documentation.md lists none of them)",
        "cflConcat cflHomomorphism cflIntersectRegular cflInverseHomomorphism cflReversal cflStar "
        "cflSubstitution cflUnion renameApart CFL_INTERSECTION_DEMO",
    ),
    **_group(
        "grammar internals behind the mapped pipeline stages",
        "minYields findDerivation applyToTree startTree variablePositions tokenise productionToText "
        "EPSILON_TOKENS expandNullable nullableSymbols generatingSymbols reachableSymbols unitPairs "
        "cnfPreconditions isCNF isUnitProduction leftmostDerivationsOf replay wrongOrderUseless",
    ),
    **_group(
        "left recursion and regular grammars — web pages; not in the documented Python surface",
        "eliminateLeftRecursion isLeftRecursive checkRightLinear grammarToNFA nfaToGrammar",
    ),
    **_group(
        "regex AST internals behind RegularExpression",
        "EMPTY_LITERAL EPSILON_LITERAL concatRegex starRegex unionRegex regexSize regexToString",
    ),
    **_group(
        "string/alphabet utilities for the web learn pages",
        "allStringsUpTo alphabetPower concat countUpTo displayWord enumerateUpTo reverse",
    ),
    **_group(
        "grading and comparison — the web practice bank's engine",
        "gradeLanguage compareTraces sampleCompare SAMPLE_CAVEAT areEquivalent equivalence separatingWord",
    ),
    **_group(
        "regular-language closure and text search — web closure lab and /search",
        "applyClosure homomorphism inverseHomomorphism keywordDFA keywordNFA searchText",
    ),
    **_group(
        "per-kind simulators behind the mapped `simulate` dispatcher",
        "simulateDFA simulateNFA simulateENFA",
    ),
    **_group(
        "PDA/TM display helpers behind the mapped run/log methods",
        "idToText stackToText tapeIdText tmIdText stateText readCell writeCell nonblankSpan tapeContents "
        "initialConfig finalConfig movesMade phaseOf splitTracks trackRows encodeInput encodedStart "
        "isDeterministicTM isComplete",
    ),
    **_group(
        "the undecidability and hierarchy content of the web app's Module 5 pages",
        "CANONICAL_LANGUAGES COMPLEMENT_PLACEMENTS DEFAULT_CELL_BUDGET FIRST_ACCEPTING_CODE_INDEX "
        "FIRST_CODE_INDEX FIRST_NON_HALTING_CODE_INDEX LANGUAGE_CLASSES PROBLEMS RECURSIVE_RE_CLOSURE "
        "REDUCTIONS UNWITNESSED_SEPARATION cellDigit codedRuleText codedSymbol decodeTM diagonalArgument "
        "diagonalTable encodePair encodeTM isKnownHard languageClass machineAt problemById reduce "
        "reductionBetween reductionsFrom splitPair binaryString stringIndex",
    ),
}


def parity_problems(
    surface: dict[str, type],
    engine_map: dict[str, str | None],
    unbound: dict[str, str],
    manifest_exports: list[str],
) -> list[str]:
    """Every drift the parity criterion names, as messages; empty means parity."""
    problems: list[str] = []
    exports = set(manifest_exports)

    for class_name, cls in surface.items():
        mro_names = [class_name] + [base.__name__ for base in getattr(cls, "__mro__", [])]
        for name in dir(cls):
            if name.startswith("_"):
                continue
            if not any(f"{owner}.{name}" in engine_map for owner in mro_names):
                problems.append(
                    f"{class_name}.{name} is public but has no ENGINE_MAP entry — which engine function is behind it?"
                )

    for key, target in engine_map.items():
        if target is not None and target not in exports:
            problems.append(f"{key} claims engine export {target!r}, which the manifest does not carry")

    accounted = {target for target in engine_map.values() if target is not None} | set(unbound)
    for export in manifest_exports:
        if export not in accounted:
            problems.append(f"engine export {export!r} is neither surfaced nor consciously excluded")
    for name in unbound:
        if name not in exports:
            problems.append(f"UNBOUND lists {name!r}, which the engine no longer exports")
    return problems
