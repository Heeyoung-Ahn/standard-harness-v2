# PKT-19 Closeout Adversarial Security Review

## Review Identity
- Lens id: `adversarial_security_review`
- Reviewer identity: `codex-pkt19-closeout-adversarial-security-review-20260630`
- Review mode: re-review after Developer remediation
- Independence basis: independent closeout lens reviewer. This reviewer did not implement PKT-19, did not author the Developer or Tester reports, did not produce the security review JSON, did not act as Reviewer adjudicator or Planner closeout owner, and did not edit implementation or generated state.
- Review boundary: evidence only. This review grants no closeout, release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, or approval-state change.

## Sources Reviewed
- `reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md`
- `.harness/runtime/state/release-candidate-bundle.js`
- `.harness/test/release-candidate-bundle.test.js`
- `.harness/runtime/state/harness-cli.js` and `.harness/runtime/state/cli-dispatch-table.js` release-candidate routing refs
- `reference/reports/developer/PKT-19_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-19_TESTER_REPORT.md`
- `reference/reports/security/PKT-19-security-review.json`
- `reference/reports/dependency-audit/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md`
- `reference/reports/dependency/DEPENDENCY-INTAKE-20260630-c4ed1ac8ee.json`
- `reference/reports/security/SECRET-SCAN-20260630-52db3eef64.json`
- `reference/reports/security/UNTRUSTED-SCAN-20260630-0c19d4568e.json`
- `reference/evidence/manifests/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE-release.json`
- `reference/reports/publish/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md`
- Current generated local bundle evidence:
  - `C:\tmp\standard-harness-pkt19-release-candidate-20260630b\release-candidate-bundle.json`
  - `C:\tmp\standard-harness-pkt19-release-candidate-tester-20260630b\release-candidate-bundle.json`

## Verdict
pass

## Findings
No findings remain after second pass.

Second pass rechecked:
- source alignment against PKT-19 forbidden-state and target-boundary requirements;
- acceptance and evidence coverage for A2, A3, A6, and A7;
- risk and regression pressure for stale generated compatibility state, unsafe local target writes, publish/deploy command execution, dependency intake, and sensitive evidence leakage;
- authority boundaries for release, publish, promotion, residual-risk acceptance, productization completion, User UAT, and closeout approval;
- current `20260630b` Developer/Tester bundle evidence rather than stale `20260630a` local bundles left under `C:\tmp`.

## Prior Finding Disposition
| Prior severity | Prior finding | Remediation evidence | Disposition |
|---|---|---|---|
| blocking | Generated compatibility state could remain in `packageManifest.includedPaths`. | `.harness/runtime/state/release-candidate-bundle.js` now includes `.agents/artifacts/current_state.md`, `.agents/artifacts/task_list.md`, `.agents/artifacts/validation_report.md`, and `.agents/artifacts/validation_report.json` in `FORBIDDEN_BUNDLE_PATH_PATTERNS`. Current `20260630b` Developer and Tester bundles list those generated compatibility paths under `forbiddenStateExclusions`; `rg` found no `CURRENT_STATE.md` or `TASK_LIST.md` entries inside the `includedPaths` section of the current bundles. Tester report records `includedForbidden: []` and all four generated compatibility state paths in `forbiddenStateExclusions`. Focused Node test passed the forbidden-state inclusion fixture. | resolved |
| high | Release-candidate target validation did not enforce the packet-approved disposable target namespace. | `.harness/runtime/state/release-candidate-bundle.js` now requires target basename prefix `standard-harness-pkt19-` and an enclosing temp root of `C:\tmp` on Windows or `/tmp` on POSIX. `.harness/test/release-candidate-bundle.test.js` adds `release candidate bundle refuses targets outside the packet tmp boundary`. Focused Node test passed this fixture. Current Developer/Tester evidence uses `C:\tmp\standard-harness-pkt19-release-candidate-20260630b` and `C:\tmp\standard-harness-pkt19-release-candidate-tester-20260630b`. | resolved |

## Verification Evidence
| Check | Result | Evidence |
|---|---|---|
| Focused release-candidate test | pass | `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness\test\release-candidate-bundle.test.js` exited `0`; 7 tests passed, 0 failed. |
| Generated compatibility state exclusion | pass | Current `20260630b` bundles list `.agents/artifacts/CURRENT_STATE.md`, `.agents/artifacts/TASK_LIST.md`, `.agents/artifacts/VALIDATION_REPORT.json`, and `.agents/artifacts/VALIDATION_REPORT.md` under `forbiddenStateExclusions`; no current evidence showed those paths in `includedPaths`. |
| Target boundary | pass | Current implementation enforces `standard-harness-pkt19-*` under `C:\tmp` or `/tmp`; focused negative fixture passed; current evidence commands use the approved `C:\tmp\standard-harness-pkt19-*` pattern. |
| Publish/deploy command execution | pass | Command validation still rejects publish/release/deploy/push patterns; current generated command inventory contains dry-run, create, validate, and evidence-manifest validation commands only. |
| Approval overclaim | pass | Implementation, current bundles, Developer report, Tester report, security JSON, manifest, and publish boundary report keep release, publish, promotion, residual-risk acceptance, productization completion, User UAT, and closeout approval false or not-approved. |
| Dependency intake and sensitive evidence | pass with scoped coverage | Dependency audit reports no new dependency surface, no lifecycle script risk, no high secret finding, and no untrusted source finding. Secret scan remains scoped evidence, supplemented by structural forbidden-state validation over the generated bundle. |

## Residual Risks
- Release-candidate evidence remains blocked by unresolved review lanes and must not be treated as release-ready.
- PKT-20 real provider worker smoke and PKT-21 structured PM source intake remain open productization blockers.
- Older local `20260630a` bundles under `C:\tmp` still reflect pre-remediation behavior and should not be cited as current closeout evidence.
- Secret scan coverage remains scoped; this pass relies on the remediated structural bundle validator plus current dependency/security evidence, not a full-content scan of every possible future bundle field.

## Approval Boundary
- This adversarial security review is evidence only.
- Closeout approval granted: no
- Release approval granted: no
- Publish approval granted: no
- Starter promotion approval granted: no
- Residual-risk acceptance granted: no
- Productization completion granted: no
- User UAT approval granted: no
- Recommended next route: Reviewer adjudication may consume this lens as pass evidence, while preserving all explicit non-approval boundaries.

## Structured Behavior Verification
- Verification type: command
- Result: pass
- Command: `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness\test\release-candidate-bundle.test.js`
- Exit code: 0
- Behavior verified: forbidden generated-state inclusion, unsafe target namespace, publish/release command overclaim, and approval overclaim checks.
