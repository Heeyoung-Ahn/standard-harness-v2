# PKT-09 Developer Report

- Packet: `PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS`
- Developer route: Orchestrator -> Developer
- Implementation status: complete for Developer scope

## Changed Behavior
- Starter skill routing now accepts natural-language intent through `SkillRouter.route(intent_text=...)` and CLI `skill-route --intent-text`.
- The starter skill catalog now records `v1_skill_catalog` as the primary source authority and treats superpowers as an optional external comparison source, not a runtime dependency.
- Skill contracts now include trigger-centered `Use when ...` descriptions, trigger keywords, process priority, required/next skill chaining, permission/authority boundaries, fallback behavior, and evidence requirements.
- Route results now include selected skills, candidate skills, skipped candidate skills, process-priority ordering, bounded skill chain, hard-gate diagnostics, source priority, superpowers dependency disposition, authority boundary, and skill-use ledger data.
- Hard-gate diagnostics now flag implementation before planning/design closure, completion before verification evidence, fixes before root-cause evidence, and unresolved review findings without disposition.
- Hard gates now fail closed when evidence state is omitted rather than only when it is explicitly false.
- Bounded one-level required/next skill chaining is implemented with conflict/recursion diagnostics.
- The catalog now includes the current root `.agents/skills` v1 surface as provider-neutral entries.
- Route results now include evaluated-but-skipped candidate skills with exclusion rationale and compact context-budget metadata.
- Starter CLI routing can be used with either legacy `--task-type` matching or new `--intent-text` matching.

## Root Contract Updates
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`

## Starter Updates
- `starter/standard-harness/_harness/catalog/skill-catalog.yaml`
- `starter/standard-harness/_harness/schemas/skill-catalog.schema.json`
- `starter/standard-harness/_harness/schemas/skill-execution.schema.json`
- `starter/standard-harness/_harness/system/standard_harness/skills/catalog.py`
- `starter/standard-harness/_harness/system/standard_harness/skills/router.py`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/test/test_skill_routing_operator_ergonomics.py`

## Tests And Validation
- RED: `reference/reports/tdd/PKT-09-red.md`
- GREEN: `reference/reports/tdd/PKT-09-green.md`
- Focused starter routing: `py -3 starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py` -> 7 passed, 0 failed.
- Starter full unittest: `$env:PYTHONDONTWRITEBYTECODE='1'; py -3 -m unittest discover -s starter\standard-harness\_harness\test` -> 86 tests passed, 0 failed, 1 skipped.
- Root focused governance: bundled `node.exe --test .harness\test\workflow-governance.test.js .harness\test\template-health-docs.test.js` -> 46 passed, 0 failed.
- Root regression equivalent to `npm test`: `node .harness\runtime\state\check-node-version.js`; `node .harness\runtime\skills\generate-skill-docs.js --dry-run`; `node --test .harness\test\*.test.js` -> 483 passed, 0 failed.
- Root validator: bundled `node.exe .harness\runtime\state\harness-cli.js validate` -> ok, structuralReady true, cutoverReady true, findings 0.
- JSON parse checks: `py -3 -m json.tool` on skill catalog and both schemas -> pass.
- Dependency / AI skill-supply-chain audit: `reference/reports/dependency-audit/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md` -> pass.

## Security Evidence
- `reference/reports/security/PKT-09-security-review.json`
- Decision: pass.
- Residual risk: low after deterministic tests; final closeout still requires four independent closeout review lenses.

## Notes
- No third-party dependency was added, removed, vendored, or upgraded.
- No `starter/standard-harness/AGENTS.md`, `CLAUDE.md`, or provider-specific starter entry contract was added.
- The skill-use ledger is a structured route-result ledger for the caller to persist under `_ops/evidence/skill-use-ledger.jsonl`; PKT-09 does not introduce automatic filesystem writes during route selection.
- `npm test` was not used as final evidence because this Windows session's npm shim cannot find `node`; equivalent bundled Node commands were run directly.
