# PKT-17 Closeout Code Quality Review

## Independent Basis

- Lens: `code_quality_review`.
- Reviewer stance: independent follow-up code-quality lens only; no implementation code, tests, approval state, generated state, release state, or closeout state was modified.
- Scope reviewed: current PKT-17 worktree implementation and evidence for clean export, promotion boundary classification, target safety, contamination audit, fresh starter verification, provenance minimization, and authority-denial behavior.
- Root approval basis: current root v1.0 PKT-17 evidence is evaluated only as Human Owner delegated Planner RFC. Existing v2.0 starter Conductor payload concepts were not treated as current root approval authority.
- Previous hold basis: this lens previously held on missing target containment for export targets nested under the source project.
- Follow-up result: previous target-containment hold is remediated in the current worktree.

## Sources Inspected

- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/rules/agent_behavior.md`
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `.agents/workflows/reviewer.md`
- `.agents/skills/code_review_checklist/SKILL.md`
- `.agents/skills/adversarial_review/SKILL.md`
- `.agents/skills/verification-before-completion/SKILL.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `reference/packets/PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT.md`
- `reference/reports/artifact-sync/PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT.md`
- `reference/reports/planner/PKT-17_READY_FOR_CODE_DELEGATION.md`
- `reference/reports/review/PKT-17-planner-challenge-review.md`
- `reference/reports/review/PKT-17-packet-doc-review.md`
- `reference/reports/review/PKT-17-closeout-adversarial-security-review.md`
- `reference/reports/review/PKT-17-closeout-evidence-review.md`
- `reference/reports/developer/PKT-17_DEVELOPER_REPORT.md`
- `reference/reports/tdd/PKT-17_TDD_EVIDENCE.md`
- `reference/reports/test/PKT-17_TESTER_REPORT.md`
- `reference/reports/security/PKT-17-security-review.json`
- `.harness/runtime/state/promote-starter.js`
- `.harness/runtime/state/promotion-boundary.js`
- `.harness/runtime/state/init-project.js`
- `.harness/test/promote-starter.test.js`
- `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`
- `reference/manuals/human/starter-promotion.md`

## Independent Checks Re-Run

| Command | Result | Evidence Use |
|---|---:|---|
| `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness\test\promote-starter.test.js` | pass, 19/19 | Confirms target containment, contamination audit, redacted secret-content finding, provenance minimization, review-lane blocking, and manual wording tests. |
| `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness\test\init-project.test.js .harness\test\promote-starter.test.js` | pass, 26/26 | Confirms promotion remediation did not regress copied-starter init behavior. |
| `npm run harness:promote-starter -- --to C:\tmp\standard-harness-pkt17-clean-export-verify-20260630-code-quality --verify` with bundled Node on `PATH` | pass | Fresh clean export verification returned `ok=true`, contamination audit `pass`, fresh verification `pass`, `releaseReadiness.decision=block`, unresolved review lanes `30`, and all authority grants `false`. |

Plain direct sandbox execution of the bundled Node command initially hit the local Windows `CreateProcessAsUserW failed: 5` runner issue, so the focused checks were rerun with the same bundled Node runtime through the approved elevated command path.

## Findings Prioritized

No current code-quality findings after second pass.

Resolved previous finding:
- Previous issue: promotion target safety did not reject descendants of the source project.
- Current source result: `validateTarget` now rejects exact source-root targets and target-root descendants of `sourceRoot`; the descendant check runs before the non-empty / `--force` handling, so `--force` does not bypass it.
- Current test result: `promotion export blocks unsafe target paths` covers missing nested target, empty nested target, and forced nested target, and verifies the missing nested target is not created.
- Current verification result: focused promotion suite passed 19/19 and focused init + promotion suite passed 26/26.

Additional remediation reviewed:
- Redacted content-level secret scanning was added to candidate contamination audit for text candidates. The test fixture verifies a secret-like `README.md` value creates a `secret_content` finding without echoing the token value in the finding reason.
- Export provenance no longer writes absolute `sourceRoot` and `targetRoot`; it records minimized labels plus summary and authority metadata. The test fixture verifies those absolute path fields are absent.

## Module-Boundary / Dependency-Direction Assessment

- Pass: module responsibility remains coherent.
- `promotion-boundary.js` owns path classification and shared authority-denial metadata.
- `promote-starter.js` owns export orchestration, target validation, contamination audit, provenance writing, fresh verification, and release-readiness output.
- `init-project.js` owns copied-starter initialization requirements and no longer requires root-only `AGENTS.md`.
- `aggregator.py` keeps clean-export versus installed-runtime validation mode selection in starter validation.
- The remediation stays inside the promotion/export boundary. It does not add a new control plane or reverse the root/starter dependency direction.
- The root approval basis remains Planner RFC delegation evidence; no current root approval logic depends on Conductor as the approval actor.

## Testability / Negative-Case Assessment

- Pass: negative coverage is now meaningful for the previous hold.
- Target safety negative cases cover exact source target, missing nested target, empty nested target, forced nested target, and non-empty external target without `--force`.
- Contamination negative cases cover product code, generated/runtime state, evidence/report paths, `.env`/secret-like filenames, raw transcripts, and secret-like content inside an otherwise allowlisted file.
- Provenance minimization is covered by a fixture that rejects absolute `sourceRoot` / `targetRoot` fields in exported provenance.
- Fresh starter verification covers install, clean starter tests, payload-boundary, expected pre-init bootstrap hold, non-interactive init, sync-state, post-init validation, and status.

## Maintainability / Regression Risk

- Maintainability is acceptable. The remediation strengthens existing functions instead of adding ad hoc scripts.
- Remaining regression pressure is concentrated in promotion boundary rules and review-lane adjudication. Those remain intentionally conservative: unresolved review lanes keep `releaseReadiness.decision=block`.
- The content secret scan is intentionally high-confidence and size-bounded. It should reduce leakage risk without turning every text file into an expensive or noisy scan.
- Working tree remains broad and includes PKT-16/17/18+ artifacts. This lens reviewed PKT-17 implementation/evidence only and does not classify unrelated dirty state.

## Residual Risk / Limitations

- This pass is only for the independent `code_quality_review` lens. It does not approve release, publish, actual starter promotion, residual-risk acceptance, productization completion, PKT-18+ implementation, User UAT, Reviewer adjudication, or Planner closeout.
- `releaseReadiness.decision` remains `block` while 30 promotion review lanes are unresolved; this is the correct PKT-17 release-boundary behavior, not a code-quality defect.
- Existing security/evidence lens files may need their own refresh if they still describe pre-remediation findings. This file does not replace those independent lenses.
- Active Context remains stale for PKT-16 and was not treated as PKT-17 route authority.

## Adversarial Second-Pass Note

Rechecked source alignment, acceptance/evidence coverage, risk/regression pressure, and authority boundaries against the current PKT-17 source and command evidence. The previous target-containment weakness is closed by code and negative tests. The added secret-content scan and provenance minimization address the related leakage concerns without changing packet scope or approval authority. No Conductor-root-approval assumption was used.

## Final Lens Status

Status: pass.

Reason: PKT-17 current worktree resolves the prior code-quality hold, keeps module boundaries intact, adds meaningful negative tests for the remediated path-safety risk, preserves authority-denial output, and passes focused promotion/init/clean-export verification. Overall packet closeout remains dependent on the other independent lenses, Reviewer adjudication, and Planner closeout using the Human Owner delegated Planner RFC basis.

## Structured Behavior Verification

- Verification type: test
- Status: pass
- Focused check: bundled Node `--test .harness\test\promote-starter.test.js` passed 19/19.
- Focused check: bundled Node `--test .harness\test\init-project.test.js .harness\test\promote-starter.test.js` passed 26/26.
- Focused check: clean export verify to `C:\tmp\standard-harness-pkt17-clean-export-verify-20260630-code-quality` passed with `ok=true`, contamination audit `pass`, fresh verification `pass`, `releaseReadiness.decision=block`, unresolved review lanes `30`, and all authority grants `false`.
- Authority basis: current root v1.0 evidence remains Human Owner delegated Planner RFC only; Conductor was not used as current root approval authority.
