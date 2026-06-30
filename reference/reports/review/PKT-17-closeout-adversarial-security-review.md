# PKT-17 Closeout Adversarial Security Review

## Independent Basis
- Lens: `adversarial_security_review`
- Packet: `PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT`
- Review pass: follow-up after prior adversarial hold findings F1-F3.
- Reviewer stance: read-only independent security lens. I did not modify implementation code, tests, packet scope, approval state, generated state, or closeout state.
- Scope limit: PKT-17 implementation and evidence only.
- Root approval context: current root v1.0 basis is Human Owner delegated Planner Ready For Code authority only.
- Conductor boundary: existing starter/v2.0 Conductor payload concepts were not treated as current root approval authority.
- Authority boundary: this review does not approve release, publish, actual starter promotion, residual-risk acceptance, productization completion, PKT-18+ implementation, packet closeout, or User UAT.

## Sources Inspected
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/rules/agent_behavior.md`
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `.agents/workflows/reviewer.md`
- `.agents/skills/adversarial_review/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/verification-before-completion/SKILL.md`
- `reference/packets/PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT.md`
- `reference/reports/planner/PKT-17_READY_FOR_CODE_DELEGATION.md`
- `reference/reports/review/PKT-17-planner-challenge-review.md`
- `reference/reports/review/PKT-17-packet-doc-review.md`
- `reference/reports/artifact-sync/PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT.md`
- `reference/reports/developer/PKT-17_DEVELOPER_REPORT.md`
- `reference/reports/tdd/PKT-17_TDD_EVIDENCE.md`
- `reference/reports/test/PKT-17_TESTER_REPORT.md`
- `reference/reports/security/PKT-17-security-review.json`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `.harness/runtime/state/promote-starter.js`
- `.harness/runtime/state/promotion-boundary.js`
- `.harness/test/promote-starter.test.js`
- `reference/manuals/human/starter-promotion.md`

## Current-Turn Verification
| Check | Command / Probe | Result |
|---|---|---|
| Prior F1 descendant-target exploit | Bundled Node focused probe using `runPromoteStarterCommand({ args: ["--to", "nested-clean-export"] })` under `C:\tmp\pkt17-adversarial-followup\source` | pass; `ok=false`, reason `Promotion target cannot be inside the source product project.`, target absent |
| Prior F1 descendant target with `--force` | Bundled Node focused probe using `--to <source>\forced-nested --force` | pass; `ok=false`, same inside-source reason, target absent |
| Prior F2 content secret leakage | Bundled Node focused probe exporting an allowlisted `README.md` with an API-key-like value | pass; export result `ok=false`, contamination `decision=block`, finding lane `secret_content`, finding redacted |
| Prior F3 provenance absolute path leakage | Bundled Node focused probe inspecting `.harness/promotion/EXPORT_PROVENANCE.json` | pass; no `sourceRoot` or `targetRoot`, uses `sourceLabel` and `targetLabel` |
| Promotion targeted tests | `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness\test\promote-starter.test.js` | pass; 19/19 |
| Init + promotion targeted tests | Bundled Node `--test .harness\test\init-project.test.js .harness\test\promote-starter.test.js` | pass; 26/26 |
| Clean export verify smoke | Bundled Node with harness CLI: `.harness\runtime\state\harness-cli.js promote-starter --to C:\tmp\standard-harness-pkt17-clean-export-verify-adversarial-20260630g3 --verify` | pass; `ok=true`, contamination `pass`, fresh verification `pass`, review lanes `30`, release readiness `block`, all authority grants false |

Note: the shell `npm` wrapper failed because it could not find `node`; that failed wrapper invocation was not used as evidence. The clean export smoke was rerun through the harness CLI with bundled Node on `PATH`.

## Findings Prioritized

No blocking, high, medium, or low adversarial-security findings remain after second pass.

### Prior F1 Disposition - Source-descendant target mutation
- Prior severity: blocking
- Current disposition: remediated
- Evidence: `validateTarget` now rejects any `targetRoot` that is a descendant of `sourceRoot`, before the non-empty/`--force` branch. Focused probes confirmed both a new nested target and a forced nested target fail closed and create no target.
- Residual note: source/target separation still depends on `path.resolve`/`path.relative` local filesystem semantics. That is sufficient for this local Windows/root harness scope; symlink/junction hardening is not claimed by PKT-17 evidence.

### Prior F2 Disposition - Secret-like content in allowlisted files
- Prior severity: blocking
- Current disposition: remediated for high-confidence content markers
- Evidence: `auditStarterCandidate` now checks non-excluded text candidates with `auditContentForSecrets`. Focused probe confirmed an API-key-like value in `README.md` produces a blocking `secret_content` finding and the finding reason does not disclose the secret value.
- Residual note: the content scan is intentionally high-confidence and lightweight. It is not a full entropy-based secret scanner, and it does not claim to detect every possible secret format.

### Prior F3 Disposition - Absolute source/target paths in export provenance
- Prior severity: medium
- Current disposition: remediated for candidate provenance
- Evidence: `writeExportProvenance` now writes `sourceLabel` and `targetLabel`, not `sourceRoot` or `targetRoot`. Focused probe confirmed the candidate provenance omits both absolute path fields.
- Residual note: command output still reports local `sourceRoot`, `targetRoot`, and candidate path as operator/runtime evidence. I do not treat that as starter-candidate leakage because the inspected issue was persisted candidate provenance.

## Secret / Runtime / Provider-State Leakage Assessment
- Path/name exclusion still blocks `.git`, root `AGENTS.md`, `.agents/runtime/**`, `.harness/cache/**`, `.harness/logs/**`, `operating_state.sqlite`, evidence/report paths, `.env*`, session/cookie/token/credential/transcript-like basenames, product paths, and generated validation reports.
- Candidate audit still allows `.agents/runtime/.gitkeep` as the clean runtime placeholder and requires export provenance.
- Content audit now blocks high-confidence secret/session/token/credential content in copied text candidates, with redacted findings.
- Clean export verify returned contamination `pass` and payload-boundary `forbiddenPathCount=0`.
- Provider-state leakage by provider-specific entry contract was not observed in the inspected PKT-17 evidence; root `AGENTS.md` is excluded.

## Target Path / No-Mutation Assessment
- Dry-run no-mutation remains covered by tests and packet evidence.
- Exact source-root target is rejected.
- New and existing descendant targets under the source root are now rejected before writing, including with `--force`.
- Non-empty external target without `--force` remains rejected.
- Clean export smoke used a disposable external target under `C:\tmp`.

## Authority-Overclaim Assessment
- PKT-17 packet evidence and delegation record correctly use Human Owner delegated Planner RFC for current root v1.0 operation.
- This lens did not use Conductor as current root approval authority.
- Command authority objects deny release, publish, implementation approval, packet closeout, risk closure, product verification, and residual-risk acceptance.
- Clean export verify returned `releaseReadiness.decision = block` with 30 unresolved review lanes. This is expected and correctly prevents release-ready claims.
- This lens pass is only adversarial-security evidence for Reviewer adjudication; it is not packet closeout approval and not release readiness approval.

## Residual Security Risk
- Remaining promotion review lanes continue to block any release-ready claim.
- The content scan is high-confidence and not a comprehensive secret-scanning engine; broader secret scanning remains a future hardening option or release-candidate evidence concern.
- Symlink/junction containment hardening was not specifically verified in this lens.
- Live provider worker smoke, release-candidate packaging, fresh-starter QA beyond export smoke, and productization completion remain outside PKT-17 adversarial-security approval and are owned by later packets.
- Root operating-contract Conductor wording remains a broader governance-contract topic; current PKT-17 root approval evidence remains Human Owner delegated Planner RFC.

## Final Lens Status
- Status: pass
- Basis: prior blocking findings F1 and F2 and medium finding F3 were independently rechecked against current code and focused probes; targeted tests passed 19/19 and 26/26; clean export verify passed while preserving release-readiness block and authority denial.
- Release status: not approved.
- Publish status: not approved.
- Actual starter promotion status: not approved.
- Productization completion status: not approved.
- Recommended next route: Reviewer adjudication may consume this adversarial-security lens as passing evidence, alongside the remaining required independent closeout lenses and Tester evidence.

## Structured Behavior Verification
- Verification type: test
- Status: pass
- Focused check: promotion targeted tests passed 19/19 with bundled Node.
- Focused check: init plus promotion targeted tests passed 26/26 with bundled Node.
- Focused check: clean export verify smoke passed; `ok=true`, contamination `pass`, fresh verification `pass`, review lanes `30`, release readiness `block`, and all authority grants false.
- Authority boundary: evidence only; no release, publish, actual starter promotion, productization completion, packet closeout, residual-risk acceptance, PKT-18+ implementation, or User UAT approval.
- Root approval basis: Human Owner delegated Planner RFC for current root v1.0 operation; Conductor was not used as current root approval authority.
