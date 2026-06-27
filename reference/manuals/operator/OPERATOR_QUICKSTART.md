# Operator Quickstart

Use this compact sequence after copying the starter into a new project.

Use `reference/commands/COMMAND_TAXONOMY.md` for the canonical command grouping and `reference/commands/COMPATIBILITY_COMMAND_POLICY.md` for compatibility command retention or deprecation rules.

Use `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md` for the starter seed / generated state boundary. In pre-init clean payload state, `ACTIVE_CONTEXT.brief.md` is a starter seed read surface, not live project truth. `starter_bootstrap_pending` from validation is an expected pre-init hold. post-init project state begins after `npm run harness:init` creates project-local runtime output.

For post-validation improvement flow and manual coverage, use `reference/manuals/human/post-validation-coverage-map.md`. Keep it link-only in compact operator context; do not inline the full map into first-run flow.

```bash
npm run harness:validate
npm run harness:init
npm run harness:validate
npm run harness:status
```

Prepare the first approved packet, then run:

```bash
npm run harness:packet-preflight -- --stage implementation-transition --packet <packet-path> --work-item <work-item-id>
```

For UI changes, generate and run Codex Browser evidence:

```bash
npm run browser:evidence:prompt -- --apply --packet <packet-path> --work-item <work-item-id> --base-url <app-url>
npm run browser:evidence:intake -- --apply --packet <packet-path> --work-item <work-item-id> --status pass --screenshot <png-paths> --observed-result "<observed result>" --scenario-result "<SCENARIO-ID>=pass:<observed behavior>" --console-errors none --network-errors none --output reference/evidence/manifests/<work-item-id>-browser.json
npm run browser:evidence:audit -- --packet <packet-path> --work-item <work-item-id> --strict
```

If screenshot capture fails, record a bounded DOM/session fallback with `status=conditional_pass` only when policy allows it. Otherwise keep the browser evidence state as `hold`, `blocked_environment`, or `not_run_agent_error`; do not mark screenshot-required fallback as pass.

Close the packet:

```bash
npm run harness:packet-preflight -- --stage closeout --packet <packet-path> --work-item <work-item-id> --strict-evidence-manifest --strict-browser-evidence
npm run harness:validate
```
