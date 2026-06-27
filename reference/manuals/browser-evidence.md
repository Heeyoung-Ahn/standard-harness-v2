# Browser Evidence Manual

Codex Browser evidence intake is the canonical browser evidence path for Codex-based projects. Playwright or another headless browser can be used as an optional CI fallback, but it is not mandatory for the starter payload.

## When browser evidence is required

Browser evidence is required when a packet changes user-facing UI, routes, forms, dashboard behavior, approval screens, reports, or other browser-observable flows.

## Generate a Codex Browser prompt

```bash
npm run browser:evidence:prompt -- --apply --packet <packet-path> --work-item <work-item-id> --base-url <app-url>
```

The generated prompt instructs Codex Browser to execute packet-defined flows and to save:

- screenshots
- session or trace notes when available
- console error summary
- network error summary
- observed result per scenario
- limitations

## Intake Codex Browser evidence

```bash
npm run browser:evidence:intake -- --apply --packet <packet-path> --work-item <work-item-id> --status pass --screenshot <png-paths> --session <session-md> --log <console-log> --observed-result "<observed result>" --scenario-result "<SCENARIO-ID>=pass:<observed behavior>" --console-errors none --network-errors none --output reference/evidence/manifests/<work-item-id>-browser.json
```

Use `status=pass` only when the active browser policy is satisfied. The default strict policy requires screenshot evidence for UI closeout.

If screenshot capture fails but Codex Browser DOM/session verification ran, record bounded fallback evidence instead of claiming a strict pass:

```bash
npm run harness:browser-evidence -- create --apply --packet <packet-path> --work-item <work-item-id> --mode codex-browser-session --engine codex-browser --status conditional_pass --browser-policy dom-session-allowed --evidence-type dom_session_transcript --session <session-md> --observed-result "<observed DOM/session result>" --scenario-result "<SCENARIO-ID>=pass:<observed behavior>" --output reference/evidence/manifests/<work-item-id>-browser.json
```

If screenshots are still required by policy, DOM/session-only fallback must remain `conditional_pass`, `warn`, `hold`, `blocked_environment`, or `not_run_agent_error`; it must not be relabeled as `pass`.

Required manifest properties:

| Field | Requirement |
|---|---|
| `evidence_type` | `browser` |
| `browser_details.browser_engine` | `codex-browser` or an accepted real browser engine |
| `packet_path` | Must match the packet under closeout |
| `work_item_id` | Must match the active work item |
| `artifact_paths` | Must include saved evidence files |
| `observed_result` | Must describe what was actually observed |
| `scenario_results` | Must include pass/fail decisions for required flows |
| `browser_details.evidence_type` | `screenshot`, `trace`, or bounded fallback such as `dom_session_transcript` |
| `browser_details.policy` | States whether screenshots, traces, or DOM/session fallback are sufficient |

## Audit evidence

```bash
npm run browser:evidence:audit -- --packet <packet-path> --work-item <work-item-id> --strict
```

Strict audit rejects static-only evidence. Static HTTP/API smoke results may support the record but do not satisfy strict UI closeout.

Audit states:

| State | Meaning | Operator action |
|---|---|---|
| `pass` | Required screenshot/trace/real-browser policy is satisfied | Continue closeout checks |
| `conditional_pass` | Active policy explicitly accepts bounded DOM/session evidence | Continue only under that policy |
| `warn` / `hold` | Evidence exists but does not satisfy strict policy | Capture missing screenshot/trace or revise policy |
| `blocked_environment` | Browser or screenshot tooling failed | Record tooling failure, retry if possible, or keep closeout blocked |
| `not_run_agent_error` | Browser agent/session did not run successfully | Re-run the browser validation path |
| `not_required` / `not_applicable` | Browser evidence is not required for this packet | Continue non-browser closeout checks |

DOM/session fallback evidence is sanitized and bounded. Do not store raw cookies, storage values, authorization headers, credentials, unbounded DOM dumps, or prompt/tool-injection text.

## Closeout binding

```bash
npm run harness:packet-preflight -- --stage closeout --packet <packet-path> --work-item <work-item-id> --strict-evidence-manifest --strict-browser-evidence
```

Closeout should block when browser evidence is missing, bound to the wrong packet, missing observed results, or static-only.

## Low-level command

The generic low-level browser evidence command is also available:

```bash
npm run harness:browser-evidence -- audit --packet <packet-path> --work-item <work-item-id> --strict
```
