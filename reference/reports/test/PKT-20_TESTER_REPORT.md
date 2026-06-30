# PKT-20 Tester Report

- Work item: `PKT-20_REAL_PROVIDER_WORKER_SMOKE`
- Packet: `reference/packets/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md`
- Tester status: pass-with-hold-narrowed-claim
- Tested date: 2026-06-30

## Tested Scope
| Acceptance | Tester result | Evidence |
|---|---|---|
| A1 real provider smoke runs or is held/narrowed with readiness excluded | pass-with-hold | `reference/reports/test/PKT-20_LOCAL_TOOL_AUTH_AVAILABILITY.md` shows Codex CLI discovered but `codex --version` blocked by WindowsApps access denied; Claude CLI/config not found. No real smoke pass is claimed. |
| A2 provider identity remains adapter-only | pass | Targeted Conductor/provider regression passed 39/39 and packet keeps provider identity as adapter/evidence only. |
| A3 credential/session/raw transcript leakage is blocked | pass | Availability evidence records no token, credential, session, cache, raw transcript, network call, or actual provider smoke was executed or inspected. Security review passes. |
| A4 delegated approval hard stops remain enforced | pass | Packet and RFC evidence limit delegated approval execution to selected Conductor/trusted validation and preserve Planner non-execution; targeted security/Conductor tests passed. |
| A5 productization completion remains incomplete | pass | Packet and Developer evidence state PKT-21 remains required; if PKT-20 closes by hold/unavailable/narrowed claim, real-provider readiness is excluded from productization-complete claims or assigned follow-up ownership. |

## Commands Run
- `node --test .harness\test\v2-p2-conductor.test.js .harness\test\security-command-surfaces.test.js`: pass, 39/39.
- `node --test .harness\test\promote-starter.test.js`: pass, 19/19.
- `node .harness\runtime\state\harness-cli.js validate`: pass. Warnings remain only for future PKT-21, PKT-22, and PKT-23 planning packets needing their own Ready For Code/evidence markers.
- `node .harness\runtime\state\harness-cli.js packet-preflight --stage implementation-transition --packet reference/packets/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md --work-item PKT-20_REAL_PROVIDER_WORKER_SMOKE`: pass before Orchestrator routing.

## Scenario Coverage
| Scenario | Status | Evidence |
|---|---|---|
| Normal | pass-with-hold | Provider tool availability is classified honestly as unavailable/blocked rather than smoke pass. |
| Error | pass | Missing real-execution approval, unavailable CLI, provider identity contamination, credential/raw transcript capture, and productization overclaim are covered by packet negative fixtures and review/security evidence. |
| Permission | pass | Real provider execution remains not approved; local availability check did not read credential/session/cache contents. |
| Regression | pass | Conductor/provider/security tests and starter promotion boundary tests passed. |
| Manual check | pass | Tester verified evidence paths and non-approval boundaries. |

## Untested Scope
- Real authenticated Codex CLI or Claude Code CLI worker smoke was not run.
- Credential, token, session, cache, raw transcript, and network/provider execution paths were not inspected or exercised.
- Release, publish, actual starter promotion, residual-risk acceptance, productization-complete, PKT-21 structured PM intake, and User UAT were not tested or approved.

## Route Recommendation
Pass to independent closeout lenses and Reviewer adjudication. Reviewer must hold if any evidence treats hold/unavailable/narrowed as real-provider readiness or claims productization-complete before PKT-21.
