# PKT-19 Developer Report

- Work item: `PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE`
- Packet: `reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md`
- Developer status: implemented
- Implementation date: 2026-06-30

## Implemented Scope
- Added root command `harness:release-candidate` for local release-candidate evidence bundle creation and validation.
- Added `release-candidate-bundle` runtime module with:
  - package manifest and promotion-plan summary;
  - command inventory with mutation classifications;
  - PKT-17/PKT-18 evidence-input authority boundary;
  - dependency/security evidence expectations;
  - unresolved-risk list that preserves PKT-20 and PKT-21 blockers;
  - forbidden root/runtime/local-state exclusion checks;
  - rollback notes generation;
  - release/publish/promotion/residual-risk/productization/User UAT non-approval flags.
- Added targeted Node tests for success and negative fixtures.

## Changed Files
- `.harness/runtime/state/release-candidate-bundle.js`
- `.harness/runtime/state/cli-dispatch-table.js`
- `.harness/runtime/state/harness-cli.js`
- `.harness/test/release-candidate-bundle.test.js`
- `package.json`

## Acceptance Mapping
| Acceptance | Developer evidence |
|---|---|
| A1 local bundle generated | `npm run harness:release-candidate -- create --to C:\tmp\standard-harness-pkt19-release-candidate-20260630b ...` passed |
| A2 PKT-17/18 evidence does not approve release | bundle `evidenceInputs` use `AUTHORITY_DENIAL`; targeted overclaim test passes |
| A3 no publish/release command executes | command inventory rejects `npm publish`, `gh release`, deploy, push, and promotion apply patterns |
| A4 security/dependency evidence included | dependency-intake, secret-scan, and untrusted-scan artifacts are recorded |
| A5 rollback and unresolved risks explicit | generated `rollback-notes.md` and `unresolved-risks.json` |
| A6 PKT-20/21 remain blockers | validation rejects missing PKT-20/PKT-21 unresolved-risk entries |
| A7 forbidden state excluded | validation rejects forbidden runtime/generated/local/credential paths in included bundle paths |

## Verification Performed
- `node --test .harness\test\release-candidate-bundle.test.js`: pass, 6 tests.
- `node --test .harness\test\promote-starter.test.js`: pass, 19 tests.
- `npm run harness:release-candidate -- create --to C:\tmp\standard-harness-pkt19-release-candidate-20260630b --packet reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md --work-item PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE`: pass.
- `npm run harness:release-candidate -- validate --bundle C:\tmp\standard-harness-pkt19-release-candidate-20260630b\release-candidate-bundle.json`: pass.
- `npm run harness:dependency-intake -- --apply`: pass; wrote `reference/reports/dependency/DEPENDENCY-INTAKE-20260630-c4ed1ac8ee.json` and `.md`.
- `npm run harness:secret-scan -- --apply`: pass; wrote `reference/reports/security/SECRET-SCAN-20260630-52db3eef64.json` and `.md`.
- `npm run harness:untrusted-scan -- --apply`: pass; wrote `reference/reports/security/UNTRUSTED-SCAN-20260630-0c19d4568e.json`.
- `npm run harness:evidence-manifest -- create --type release ... --apply`: pass; wrote `reference/evidence/manifests/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE-release.json`.
- `npm run harness:evidence-manifest -- validate --manifest reference/evidence/manifests/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE-release.json --packet reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md --work-item PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE`: pass.

## Generated Local Bundle
- Bundle root: `C:\tmp\standard-harness-pkt19-release-candidate-20260630b`
- Bundle manifest: `C:\tmp\standard-harness-pkt19-release-candidate-20260630b\release-candidate-bundle.json`
- Command inventory: `C:\tmp\standard-harness-pkt19-release-candidate-20260630b\command-inventory.json`
- Unresolved risks: `C:\tmp\standard-harness-pkt19-release-candidate-20260630b\unresolved-risks.json`
- Rollback notes: `C:\tmp\standard-harness-pkt19-release-candidate-20260630b\rollback-notes.md`

## Remediation Notes
- Independent challenge/security review found generated compatibility state inclusion risk for `.agents/artifacts/CURRENT_STATE.md`, `.agents/artifacts/TASK_LIST.md`, and validation reports.
- Developer remediation excludes those paths from bundle `includedPaths` and records them under `forbiddenStateExclusions`.
- Bundle target validation now requires `C:\tmp\standard-harness-pkt19-*` and rejects other local targets.
- Remediated focused test: `node --test .harness\test\release-candidate-bundle.test.js`: pass, 7 tests.

## Packet Evidence
- Release evidence manifest: `reference/evidence/manifests/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE-release.json`
- Publish boundary report: `reference/reports/publish/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md`

## Approval Boundary
Developer implementation does not approve release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, or packet closeout.
