# PKT-01 Walkthrough Evidence

## Packet
- Packet: `PKT-01 Project Operating Folder Contract`
- Date: 2026-06-28
- Route: Orchestrator -> Developer -> Tester -> Reviewer -> Planner closeout
- Scope: enforce clean starter folder contract, `_ops` reset behavior, contamination checks, copied-starter validation, and starter-facing usage text.

## Implemented Behavior
- Added `ops-reset` CLI behavior for copied projects.
- Added reset logic that removes `_ops/` operating records, recreates required `_ops/**` folders, and recreates required `product/docs/**` folders.
- Preserved `_harness/**` and `product/**` deliverables during reset.
- Added stricter starter contamination classification for real packet history, real evidence history, and generated active context under `_ops/`.
- Allowed initialized copied starters to validate their expected generated runtime state while keeping the nested clean starter payload strict.
- Documented `ops-reset`, Markdown/TSV/CSV document rules, and clean starter operation in starter-facing docs.
- Restored root harness compatibility anchors in planning documents without copying root operating history into the starter payload.

## Verification Commands
All commands were run from `C:\Newface\30 Github\standard-harness-v2`.

| Command | Result |
|---|---|
| `$env:PYTHONDONTWRITEBYTECODE='1'; python -m unittest discover -s starter\standard-harness\_harness\test` | pass, 5 tests |
| `$env:PYTHONDONTWRITEBYTECODE='1'; python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter` | pass, `{"diagnostics":[],"status":"ok"}` |
| `npm.cmd test` | pass, 447 tests |
| `npm.cmd run harness:validate` | pass, `ok: true`, `structuralReady: true`, `cutoverReady: true`, no findings |
| copied-starter smoke: copy to `C:\tmp`, run `init`, `ops-reset`, `validate --starter` | pass, diagnostics empty |
| `rg --files starter\standard-harness | rg "__pycache__|\.pytest_cache|\.harness|harness\.sqlite3|operating_state\.sqlite|AGENTS\.md$"` | no matches |

## Acceptance Mapping
| Acceptance | Evidence |
|---|---|
| `_harness/`, `_ops/`, and `product/` zone contract remains explicit | starter docs, policy-driven init/reset tests, validation pass |
| Required folders are created by CLI/runtime behavior | Python tests and copied-starter smoke |
| File names are samples unless required by schema/policy/CLI | starter docs and packet scope preserved |
| `product/docs/project`, `product/docs/packets`, `product/docs/pmo` placement is created | Python tests and copied-starter smoke output |
| WBS-compatible PMO defaults to TSV and allows CSV by project need | starter docs update |
| `_ops` reset does not touch `_harness` or product deliverables | Python reset safety test |
| Starter validation rejects contamination | negative contamination tests and clean payload search |
| Provider examples remain non-authoritative | no provider-specific entry contract added; `starter/standard-harness/AGENTS.md` absent |
| Copied-starter smoke path is tested | temp copy `init -> ops-reset -> validate --starter` pass |
| Completion is evidence-backed | command results above |

## N/A Decisions
- Browser/E2E: N/A. PKT-01 changed CLI/runtime/docs behavior only and did not change a web-facing UI.
- Release/publish: N/A. PKT-01 did not publish or package a release.

## Residual Risks
- Full gate engine, documenter closeout generator, PM rhythm, long memory question answering, multi-provider orchestration, and skill routing remain deferred by packet scope.
- This workspace is not currently a Git worktree, so commit/push evidence is not available in this closeout.

---

# PKT-04B Walkthrough Evidence

## Packet
- Packet: `PKT-04B Clean Starter Lifecycle Hardening`
- Date: 2026-06-28
- Route: Orchestrator -> Developer -> Tester -> Reviewer -> Planner closeout
- Scope: separate copied-starter runtime validation from clean export proof; harden contamination checks, compact PMO tests, and bounded smoke temp cleanup.

## Verification Commands
| Command | Cwd | Result |
|---|---|---|
| `python -m unittest _harness.test.test_operating_folder_contract` | `starter/standard-harness` | pass, 10 tests |
| `python -m unittest discover _harness\test` | `starter/standard-harness` | pass, 28 tests |
| `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime` | `starter/standard-harness` | pass, `validationMode=installed-runtime`, `cleanExportProof=false`, `runtimeGeneratedStateTolerated=true` |
| `node .harness/runtime/state/dev05-cli.js packet-preflight --packet reference/packets/PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING.md --stage implementation-transition` | repo root | pass, `Disposition: implementation-ready` |

## Acceptance Mapping
| Acceptance | Evidence |
|---|---|
| Runtime and clean-export validation are distinguishable | CLI flags and JSON metadata distinguish `installed-runtime` from `clean-export` |
| Clean export rejects cache contamination | `test_clean_export_validation_rejects_runtime_cache_files` |
| Clean export rejects representative non-cache contamination | `test_clean_export_validation_rejects_representative_non_cache_contamination` |
| Runtime validation is not reported as clean export proof | direct CLI smoke output reports `cleanExportProof=false` |
| Compact PMO tests match PKT-04A | PMO folder contract test requires `day-wrap-up` and `wbs`, not legacy broad Markdown folders |
| Smoke temp cleanup is bounded | smoke workspace cleanup tests cover success deletion and path-safety refusal |

## Untested Or Out Of Scope
- Release packaging, starter promotion, and PKT-05 long-memory work remain out of scope.
- Global PLN-00/PLN-01 baseline hold remains a separate project-state blocker, not a PKT-04B behavior failure.
