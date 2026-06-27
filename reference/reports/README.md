# Reports Directory

Use this directory for fresh-start validation reports, friction logs, implementation drill summaries, and reviewable report artifacts that are not canonical state.

- Keep canonical current state in `.agents/artifacts/*`, generated state in `.agents/runtime/*`, and validation output in `.agents/artifacts/VALIDATION_REPORT.*`.
- Put scenario reports here when they need to remain reviewable after a packet closes.
- If a report identifies reusable harness friction, open or link a packet before changing root or standard-template assets.
- Do not treat a report as product acceptance evidence unless the active packet cites it under Tester or Reviewer evidence.
- Fresh-start validation reports are review/evidence surfaces only; they are not canonical state.

## E2E Effort / Token Reporting Contract

Use this contract when an E2E report, fresh-start report, or retrospective compares product implementation effort with harness compliance effort.

- `Telemetry status: measured | estimated | unavailable`
- `measured`: use only when the report cites a concrete runtime, tool, log, trace, or accounting source for the value.
- `estimated`: use when the report infers the value; include the estimation method and do not present it as exact telemetry.
- `unavailable`: use when telemetry is absent; include the unavailable rationale and the non-metric evidence used instead.
- `Measured product implementation tokens`: record only measured product-work tokens with an evidence source.
- `Measured harness compliance tokens`: record only measured harness/planning/validation tokens with an evidence source.
- `Estimated product / harness split`: record the estimated split only with an estimation method.
- `Estimation method`: describe the sampling, transcript review, time-box, or other method used for an estimate.
- `Evidence source`: cite the concrete source for measured values or the source material used for estimates.
- `Unavailable rationale`: explain why token/cost telemetry is not available.
- Do not invent exact token/cost metrics when runtime telemetry does not expose them.
- Reviewer holds reports that present exact token/cost numbers without measured evidence.

No reusable fresh-start E2E report template is currently shipped in this repository or standard-template. Do not create or restore a report template, report generator, or retired E2E manual without a new approved packet.

## Sandbox / Pilot Evidence Bundle

Use this checklist when a sandbox, prototype, or pilot is used to learn before production implementation.

- `Pilot scope`: scenario name, fake/local data only, and the sandbox path or separate repository.
- `Confidence claim`: the narrow claim the pilot supports, such as workflow feasibility, HTTP contract shape, browser smoke, or gate behavior.
- `Production readiness`: use `not-claimed` unless a separate production packet verifies production code and release criteria.
- `Promotion boundary`: follow-up production packet ID, or `none planned`.
- `Payload separation`: confirm reusable starter payloads did not receive pilot-only files.
- `Verification evidence`: command output, HTTP/browser smoke, screenshots, logs, or report paths.

Pilot evidence can support planning and risk discovery, but it does not weaken strict/high production gates. Harness validation proves harness structure and state consistency; product acceptance still needs product-specific Tester/Reviewer evidence in the active packet.

## Browser and HTTP smoke taxonomy

Record HTTP smoke and Browser smoke as separate rows.

| Evidence class | Valid states | Notes |
|---|---|---|
| HTTP smoke | `passed`, `failed`, `not_required`, `blocked_environment` | Proves server/API reachability or contract shape only. |
| Browser smoke | `passed`, `failed`, `not_required`, `blocked_environment`, `not_run_agent_error` | Proves rendered UI flow only when the Browser workflow actually ran. |

Use `not_run_agent_error` when the agent failed to initialize or execute the Codex Browser workflow. Do not rewrite that state as `tool unavailable`, product failure, or Browser pass.
