# PKT-16 Release Baseline Reconciliation Evidence

## Scope
This report records the evidence gathered before drafting `PKT-16_RELEASE_BASELINE_RECONCILIATION`.
It is a release-baseline evidence report only. It does not approve Ready For Code,
release, publish, starter promotion, closeout, residual risk, or product verification.

## Commands Run
| Surface | Command / Check | Result | Evidence Summary |
|---|---|---|---|
| Root validation | `npm.cmd run harness:validate` | pass | Root structural and cutover validation returned `ok: true` with no findings. |
| Raw starter copy | Copied `starter/standard-harness/*` to `C:\tmp\standard-harness-pkt16-e2e-20260630-071039` | pass | Copy completed, but copied raw ignored artifacts too. |
| Clean export validation before init | `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --clean-export` | fail | Failed on `.harness`, `_ops/evidence/PKT-14`, `_ops/packets/PKT-14-*`, `_ops/wiki/PKT-14-*`, and `__pycache__`. |
| Source payload inventory | `Get-ChildItem -Force starter\standard-harness` and `_ops`/`__pycache__` inventory | confirmed blocker | Raw working tree contains ignored `.harness`, PKT-14 operating records, and Python caches under the starter payload path. |
| Git tracking check | `git ls-files starter/standard-harness/.harness starter/standard-harness/_ops/evidence starter/standard-harness/_ops/wiki ...` | confirmed ignored contamination | Only `_ops/evidence/.gitkeep` and `_ops/wiki/.gitkeep` were tracked; the blocking files are present in the working tree but ignored/untracked. |
| Init | `python _harness\bin\harness_cli.py --json --harness-root . init` | pass | Created/recreated operating folders and `.harness/state/harness.sqlite3` in the copied project. |
| Installed-runtime validation | `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime` | pass | Installed runtime validation returned `status: ok`, diagnostics empty. |
| First packet | `packet-create --packet-id PKT-0001 ...` | pass | Created `PKT-0001` as planned, low risk, docs-only, approval pending, `docs-only@1`. |
| QA before reset | `operating-qa --question "What happened, what evidence supports it, and what should happen next?"` | contaminated pass | Returned PKT-14 Conductor worker evidence and PKT-14 wiki/risk sources from the copied `_ops` history. |
| Closeout smoke | `closeout --closeout-id CLOSEOUT-0001 --packet-id PKT-0001 ...` | guarded pass | Command returned `status: ok` but closeout decision was `blocked` with missing acceptance, claim, evidence, gate, review governance, independent lens, and filesystem drift diagnostics. |
| Reset | `ops-reset` plus post-reset path checks | pass | Removed `_ops`, recreated required folders, preserved `_harness` and a product fixture, and removed `_ops/evidence/PKT-14`. |
| QA after reset | `operating-qa --question ...` | blocked as expected | Returned `status: blocked` because fresh trusted sources were missing; no stale PKT-14 answer remained. |
| Installed-runtime validation after reset | `validate --starter --installed-runtime` | pass | Installed runtime validation still passed after reset. |
| Clean export validation after init/reset | `validate --starter --clean-export` | expected fail | Failed on runtime `.harness` and Python caches; this is expected for an initialized project, but caches also prove raw export must be sanitized. |
| Promotion dry-run | `npm.cmd run harness:promote-starter -- --dry-run --to C:\tmp\standard-harness-pkt16-promotion-dry-run-20260630-071039` | pass with review holds | Dry-run passed with include 974, exclude 158, review 44; dry-run grants no approval and requires review-lane adjudication before export. |
| Promotion regression | `node --test .harness/test/promote-starter.test.js` | pass | 17/17 tests passed. |
| Starter regression | `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover starter\standard-harness\_harness\test` | pass | 138 tests passed, 1 skipped. |
| Git state | `git status --short --branch` | clean before edits | `main...origin/main` before PKT-16 document edits. |

## Official Closure Matrix
| E2E Surface | Productization Status | Evidence | Closure / Blocker Decision |
|---|---|---|---|
| Copy from raw `starter/standard-harness/` | blocker | Clean export validation failed on ignored `.harness`, PKT-14 `_ops` records, wiki/evidence history, and caches. | Do not claim the raw starter folder is release-ready. PKT-16 must make sanitized export/copy the official path or remove/guard ignored contamination before release. |
| Init in copied project | closed for baseline | `init` passed and created required folders/state DB. | No blocker for installed use. Preserve this as a release smoke requirement. |
| Installed-runtime validation | closed for baseline | `validate --starter --installed-runtime` passed before and after reset. | No blocker for initialized local use. |
| First packet creation | closed with ergonomic follow-up | `packet-create` produced planned `PKT-0001`, low risk, docs-only, approval pending. | Functional baseline passes; follow-up should improve human onboarding/first-packet guidance if productization wants a smoother first-run experience. |
| QA before reset | blocker | `operating-qa` answered from PKT-14 root/hardening memory in a copied raw starter. | Fresh copied projects must not inherit root packet history. Clean export or reset must be enforced before QA is trusted. |
| Closeout guard | closed for baseline | Unsupported first-packet closeout returned `decision_status: blocked` with missing evidence/gate/review diagnostics. | Guard behavior works; keep as regression evidence for productization. |
| Reset | closed for baseline | `ops-reset` removed `_ops`, recreated required folders, preserved `_harness` and product fixture. | Reset behavior works and removes stale PKT-14 operating records. |
| QA after reset | closed for baseline | `operating-qa` returned blocked/unsupported with no source refs after reset. | Correct safe behavior for a fresh project with no evidence. |
| Clean export after init/reset | not a release path | Clean export failed on runtime `.harness` and caches. | Expected for initialized projects. Productization docs must distinguish clean export candidate validation from installed-runtime validation. |
| Promotion dry-run | hold before export | Dry-run passed but has 44 review lanes, including starter `_ops/**`, `.harness/state`, starter docs, and product `.gitkeep` files. | Dry-run is usable evidence, but actual export/promotion remains blocked until review lanes are adjudicated or policy is hardened. |
| Regression tests | closed for baseline | Node promotion tests and starter Python tests passed. | Use as supporting evidence, not as replacement for copy/init/QA/reset/promotion smoke. |

## Productization Blockers
| ID | Blocker | Evidence | Required Follow-up Owner |
|---|---|---|---|
| PKT16-B1 | Raw starter working directory is not clean-export ready. | Clean export validation failed on ignored `.harness`, `_ops` PKT-14 history, wiki/evidence records, and Python caches. | PKT-16 implementation or the next approved productization packet. |
| PKT16-B2 | Raw copied starter QA can answer from inherited PKT-14 root/hardening memory. | Pre-reset `operating-qa` returned PKT-14 Conductor worker evidence and wiki/risk sources. | PKT-16 implementation or the next approved productization packet. |
| PKT16-B3 | Promotion dry-run leaves release-blocking review lanes unresolved. | Dry-run passed with review 44 and showed unclassified starter `_ops/**`, `.harness/state/harness.sqlite3`, product `.gitkeep`, `README.md`, and `START_HERE.md` paths. | PKT-16 implementation or a dedicated promotion/export packet. |

## Non-Blocking Follow-Up
| ID | Follow-up | Evidence | Boundary |
|---|---|---|---|
| PKT16-F1 | Improve first-packet onboarding ergonomics. | `packet-create` works but remains CLI-heavy and produces only an operating packet record. | Not a blocker while START_HERE documents the command. |
| PKT16-F2 | Keep live authenticated Codex CLI / Claude Code CLI execution as explicit approval-boundary work. | PKT-14/15 and current baseline did not run live authenticated providers. | Not required for local release baseline unless Human Owner selects that route. |
| PKT16-F3 | Structured PM TSV/CSV/WBS ingestion and lower-level non-index reference evidence hardening remain later operating-intelligence expansion. | Prior hardening closeout recorded these as follow-up. | Not a blocker for copy/init/reset/promotion baseline. |

## Destructive Command Guard Record
- Reviewed command: `python _harness\bin\harness_cli.py --json --harness-root . ops-reset`
- Target scope: `C:\tmp\standard-harness-pkt16-e2e-20260630-071039\_ops`
- Risk: deletes copied-project operating records in a disposable temp copy.
- Rollback: no source rollback required; target is a temp copy. Root repo and source starter payload were not reset.
- Guard decision: allow for PKT-16 evidence because the Human Owner explicitly requested reset verification and the target was isolated under `C:\tmp`.

## Verdict
The implemented starter is usable after init and installed-runtime validation, and reset/closeout guards behave correctly. The product is not yet release-ready as a clean raw starter export because raw copy carries ignored local runtime/evidence/cache contamination and QA can read inherited PKT-14 memory before reset.
