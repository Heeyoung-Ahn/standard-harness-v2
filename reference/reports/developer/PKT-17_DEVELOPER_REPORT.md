# PKT-17 Developer Report

## Summary
Implemented and remediated PKT-17 clean export hardening in the root export/promotion
path. The implementation target remains the clean v2.0 starter payload export; the current
root v1.0 harness is only the development environment and does not use v2.0 `Conductor`
concepts as root approval authority.

## Changed Behavior
- `promote-starter` emits `releaseReadiness` metadata and blocks release-ready claims when
  review lanes remain unresolved.
- Root-only `AGENTS.md` is excluded from clean starter export.
- `.agents/runtime/*` generated/read-model state is excluded from clean starter export; export
  still writes a clean `.agents/runtime/.gitkeep` placeholder.
- Exported package `npm test` is narrowed to the clean starter promotion smoke test instead of
  running the full root harness test suite.
- `harness:init` no longer requires root-only `AGENTS.md` in a clean export candidate.
- Promotion target validation rejects targets equal to or inside the source project. `--force`
  does not bypass the descendant-of-source guard.
- Candidate contamination audit scans allowed text files for high-confidence secret, token,
  credential, session, cookie, private-key, or bearer-token markers and emits redacted
  `secret_content` findings.
- Export provenance no longer writes absolute `sourceRoot` or `targetRoot` paths into the clean
  candidate.
- Human-facing starter promotion manual states unresolved review lanes block release-ready
  claims and clean export evidence grants no release/publish/approval authority.

## Changed Files
- `.harness/runtime/state/promote-starter.js`
- `.harness/runtime/state/promotion-boundary.js`
- `.harness/runtime/state/init-project.js`
- `.harness/test/promote-starter.test.js`
- `reference/manuals/human/starter-promotion.md`
- `reference/packets/PKT-17_PRODUCTIZATION_READINESS_AND_CLEAN_EXPORT.md`
- `reference/reports/planner/PKT-17_READY_FOR_CODE_DELEGATION.md`
- `reference/reports/tdd/PKT-17_TDD_EVIDENCE.md`
- `reference/reports/test/PKT-17_TESTER_REPORT.md`

## Remediation Disposition
| Prior Finding | Developer Action | Evidence |
|---|---|---|
| Target inside source project could be accepted. | Added descendant-of-source rejection in `validateTarget`; added negative tests for missing nested target, empty nested target, and forced nested target. | `node --test .harness\test\promote-starter.test.js` pass, 19/19. |
| Allowed files could carry embedded secrets. | Added content-level secret/session/token/credential scan for eligible text files with redacted findings. | Secret fixture in `README.md` now produces `secret_content` finding without leaking the fixture value. |
| Provenance leaked absolute local paths. | Replaced absolute `sourceRoot`/`targetRoot` provenance fields with non-sensitive labels and generation metadata. | Provenance test asserts `sourceRoot` and `targetRoot` are absent. |

## Fresh Verification
| Command | Result |
|---|---|
| `node --test .harness\test\promote-starter.test.js` via bundled Node | pass, 19/19 |
| `node --test .harness\test\init-project.test.js .harness\test\promote-starter.test.js` via bundled Node | pass, 26/26 |
| Concise clean export verify to `C:\tmp\standard-harness-pkt17-clean-export-verify-20260630f` | pass; `ok=true`, contamination `pass`, fresh verification `pass` |

## Fresh Export Verification Summary
- `npm install`: pass.
- `npm test`: pass.
- `npm run harness:payload-boundary`: pass.
- Pre-init `npm run harness:validate`: expected `starter_bootstrap_pending` hold accepted.
- Non-interactive `harness:init`: pass.
- `harness:sync-state`: pass.
- Post-init `harness:validate`: pass.
- `harness:status`: pass.
- `releaseReadiness.decision`: `block`.
- Unresolved review lanes: `30`.
- Authority grants for release, publish, implementation approval, packet closeout, risk
  closure, product verification, and residual-risk acceptance: all `false`.

## Residual Boundaries
- `releaseReadiness.decision` is intentionally `block` while review lanes remain unresolved.
- This does not approve release, publish, actual starter promotion, residual-risk acceptance,
  productization completion, packet closeout, PKT-18+ implementation, or User UAT.
- PKT-18+ remain provisional follow-up packets and must be planned, reviewed, approved, and
  implemented in sequence after PKT-17 closeout.
