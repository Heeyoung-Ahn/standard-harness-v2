# PKT-17 TDD Evidence

## Scope
- Packet: `PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT`
- Behavior changed:
  - promotion output exposes release-readiness blocking when review lanes remain unresolved;
  - root `AGENTS.md` is excluded from clean starter export;
  - `.agents/runtime/*` generated/read-model state is excluded from clean starter export;
  - exported package `npm test` is narrowed to clean-starter-safe promotion smoke;
  - starter init no longer requires root-only `AGENTS.md`;
  - unsafe target descendants of the source project are rejected;
  - allowed text files are scanned for high-confidence secret/session/token/credential
    contamination;
  - export provenance avoids absolute local paths.

## RED Evidence
| Behavior | Command / Probe | Expected Failure Before Fix | Result |
|---|---|---|---|
| Release-ready blocked by unresolved review lanes | `node --test .harness\test\promote-starter.test.js --test-name-pattern "promotion result blocks release-ready claims"` | `releaseReadiness` missing | failed as expected |
| Operator manual documents release-ready/review-lane boundary | `node --test .harness\test\promote-starter.test.js --test-name-pattern "starter promotion workflow is documented"` | missing `release-ready` wording | failed as expected |
| Root `AGENTS.md` excluded from export boundary | `node --test .harness\test\promote-starter.test.js --test-name-pattern "promotion boundary"` | `AGENTS.md` classified as include | failed as expected |
| `.agents/runtime/*` excluded from export boundary | `node --test .harness\test\promote-starter.test.js --test-name-pattern "promotion boundary"` | `.agents/runtime/DOC_ROUTE.json` classified as include | failed as expected |
| Exported package test script is clean-starter safe | `node --test .harness\test\promote-starter.test.js --test-name-pattern "promotion export writes only reusable"` | copied full root `.harness/test/*.test.js` script | failed as expected |
| Init accepts clean export without root `AGENTS.md` | `npm run harness:promote-starter -- --to <tmp> --verify` | `Missing required starter path: AGENTS.md` | failed as expected |
| Descendant target inside source root is rejected | focused local nested-target probe / promotion unsafe-target test | nested target accepted and created | failed as expected before remediation |
| Embedded secret in otherwise allowed file is rejected | contamination fixture with `README.md` secret marker | audit passed with no finding | failed as expected before remediation |
| Export provenance omits local absolute paths | provenance fixture | `sourceRoot` and `targetRoot` present | failed as expected before remediation |

## GREEN Evidence
| Command | Result | Notes |
|---|---|---|
| `node --test .harness\test\promote-starter.test.js` via bundled Node | pass, 19/19 | promotion/export unit contract, target safety, redacted content scan, provenance minimization |
| `node --test .harness\test\init-project.test.js .harness\test\promote-starter.test.js` via bundled Node | pass, 26/26 | init plus promotion regression |
| Concise clean export verify to `C:\tmp\standard-harness-pkt17-clean-export-verify-20260630f` | pass | contamination `pass`; fresh verification `pass`; all eight lanes pass or accepted pre-init hold |

## Regression Coverage Added
- Missing nested target under source root is rejected and not created.
- Empty nested target under source root is rejected.
- Nested target under source root with `--force` is rejected.
- Non-empty external target without `--force` remains rejected.
- Allowed `README.md` content containing a high-confidence secret marker is blocked as
  `secret_content`, and the finding reason redacts the secret value.
- `EXPORT_PROVENANCE.json` omits `sourceRoot` and `targetRoot`.

## Authority Boundary
- All evidence is packet-bound implementation evidence only.
- The export result does not approve release, publish, actual starter promotion, residual-risk
  acceptance, productization completion, packet closeout, PKT-18+ implementation, or User UAT.
- `releaseReadiness.decision` remains `block` while 30 unresolved review lanes exist.
