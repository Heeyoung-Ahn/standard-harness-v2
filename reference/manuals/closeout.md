# Closeout Manual

Closeout is the hard gate that decides whether a packet can be marked complete.

## Command

```bash
npm run harness:packet-preflight -- --stage closeout --packet <packet-path> --work-item <work-item-id> --strict-evidence-manifest --strict-browser-evidence
```

## Evidence expectations

| Evidence type | Required when | Closeout rule |
|---|---|---|
| TDD | Behavior-bearing code changes | Must be packet-bound or explicitly exempted |
| Security | Security-sensitive or untrusted-input changes | Must be packet-bound and reviewed |
| Browser | UI or browser-observable changes | Must be Codex Browser or equivalent real-browser evidence in strict mode |
| Dependency | Dependency-sensitive changes | Must include intake and risk decision |
| Release | Release/canary-sensitive changes | Must include release evidence and known risks |

## Minimal CSO security review pass example

Use this as a shape example only. It is not approval for another packet and it does not replace a scoped security review when the active packet requires one.

```json
{
  "artifact_type": "security_review_report",
  "schema_version": "standard-harness-security-review/v2.2",
  "packet_path": "reference/packets/PKT-01.md",
  "work_item_id": "WI-01",
  "mode": "scoped",
  "phases_run": [0, 1, 12, 13, 14],
  "decision": "pass",
  "findings": [],
  "filter_stats": { "raw_candidates": 0, "suppressed_false_positives": 0, "main_findings": 0 }
}
```

Required fields include `schema_version`, one packet binding field such as `packet_path`, `work_item_id` when available, `mode`, `phases_run`, `decision`, `findings`, and `filter_stats`. If findings exist, include redacted evidence and recommendation fields required by `reference/schemas/CSO_SECURITY_REVIEW_SCHEMA.json`.

## Browser evidence rule

Static HTTP/API smoke evidence is not enough for strict UI closeout. Strict browser evidence must include:

- matching `packet_path`
- matching `work_item_id`
- real browser engine such as `codex-browser`
- screenshot or session artifact paths
- scenario-level observed results
- console/network error summary

When screenshot export fails, record the failure honestly. DOM/session evidence can be stored as bounded `dom_session_transcript` fallback evidence, but it satisfies strict closeout only when the active browser policy declares DOM/session evidence sufficient. Under screenshot-required policy, fallback evidence remains `hold`, `blocked_environment`, or `not_run_agent_error` and should not be counted as product pass.

## Dashboard caveat

`npm run harness:codex-ready` and `npm run harness:v28` are dashboards. They are not approval substitutes for closeout.
