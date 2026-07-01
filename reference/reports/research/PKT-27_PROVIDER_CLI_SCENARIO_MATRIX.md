# PKT-27 Provider CLI Scenario Matrix

Packet: PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP
Date: 2026-07-01
Owner role: Developer
Status: implemented and tested

## Purpose

This report records the concrete provider CLI routing and result-recovery scenarios
implemented for PKT-27. The goal is to prevent the Conductor-worker loop from becoming
a manual prompt-copy/result-paste process. In normal automatic mode, the Conductor
builds bounded provider adapter commands from `providerTopology`, executes them through
`WorkerExecutor`, recovers artifacts/envelopes, records provider runs, adjudicates, and
routes the next step.

## Official Interface Basis

- Codex CLI local evidence: `codex-cli 0.142.5`; `codex exec --help` confirms
  non-interactive `exec`, `--ephemeral`, `--sandbox`, `-C/--cd`,
  `-o/--output-last-message`, `--json`, `--output-schema`, `--model`, and `--profile`.
  `--ask-for-approval` is a Codex global option and must appear before `exec`.
  Although Codex CLI supports `danger-full-access`, the starter's normal automatic
  delivery loop rejects that mode.
- Codex manual evidence: non-interactive `codex exec` writes the final response through
  `--output-last-message`; sandbox and approval policy are separate controls.
- Claude Code official docs evidence: headless execution uses `claude -p/--print`,
  `--output-format json`, `--bare`, `--allowedTools`, `--permission-mode`,
  `--max-turns`, `--max-budget-usd`, `--resume`, and `--continue`.

## Implemented Scenario Matrix

| ID | Provider | Scenario | CLI Routing | Result Recovery | Tested By |
|---|---|---|---|---|---|
| S01 | Codex | Planner/read-only final answer | `codex --ask-for-approval never exec --ephemeral --sandbox read-only -C <root> -o <artifact>` | final message artifact plus metadata sidecar | `codex_plan_read_only_final_message` |
| S02 | Codex | Developer implementation with workspace writes | `codex --ask-for-approval never exec --sandbox workspace-write ...` | final message artifact; allowed code changes recovered by executor `worktree_changes` when `allowedChangeRoots` is declared | `codex_implementation_workspace_write`, executor allowed-change test |
| S03 | Codex | Reviewer with model override | adds `--model <model>` | final message artifact plus metadata | `codex_review_model_override` |
| S04 | Codex | Tester with profile override | adds `--profile <profile>` | final message artifact plus metadata | `codex_testing_profile_override` |
| S05 | Codex | JSON contract response | adds `--output-schema <schema>` and `requireJson=true` | final artifact must parse as JSON or fails closed | `codex_json_contract_schema` |
| S06 | Codex | JSONL event stream request | adds `--json` | adapter still recovers final message from `-o`; stdout is safe metadata only | `codex_jsonl_event_capture` |
| S07 | Codex | Ignore user config/rules | adds `--ignore-user-config --ignore-rules` | final message artifact plus metadata | `codex_ignore_local_user_config` |
| S08 | Codex | Interactive approval boundary | global `--ask-for-approval on-request` before `exec` | final message artifact plus metadata | `codex_on_request_approval_boundary` |
| S09 | Codex | Provider executable override | uses descriptor `providerCli.codex` argv prefix | final message artifact plus metadata | `codex_provider_argv_override` |
| S10 | Codex | Metadata sidecar | same as selected scenario | metadata JSON records status/provider/role/sandbox/approval/hash only; raw provider stderr is not emitted | `codex_metadata_sidecar` |
| S11 | Codex | Invalid or elevated sandbox option | adapter rejects before subprocess | diagnostic `codex_invalid_sandbox_option`; includes `danger-full-access` in normal automatic path | `codex_invalid_sandbox`, `codex_danger_full_access_rejected` |
| S12 | Codex | Invalid approval option | adapter rejects before subprocess | diagnostic `codex_invalid_approval_option` | `codex_invalid_approval` |
| S13 | Codex | Nonzero provider exit | subprocess returns nonzero | diagnostic `codex_cli_nonzero`; executor reports non-pass | `codex_nonzero` |
| S14 | Codex | Missing provider executable | subprocess raises `OSError` | diagnostic `codex_cli_unavailable`; executor can promote to `tool_unavailable` | `codex_unavailable` |
| S15 | Codex | Required JSON parse failure | `requireJson=true` with non-JSON artifact | diagnostic `codex_cli_json_parse_failed` | `codex_json_required_but_invalid` |
| S16 | Claude Code | Planner/headless bare JSON | `claude -p <prompt> --output-format json --bare ...` | parse JSON, write `result` artifact, persist full JSON sidecar | `claude_plan_bare_json` |
| S17 | Claude Code | Reviewer read-only tools | adds `--allowedTools Read --permission-mode dontAsk` | result artifact plus JSON sidecar | `claude_review_read_only_tools` |
| S18 | Claude Code | Developer edit tools | adds `--allowedTools Read,Edit,Bash(git *) --permission-mode acceptEdits` | result artifact plus JSON sidecar; code changes recovered only through declared `allowedChangeRoots` | `claude_implementation_edit_tools` |
| S19 | Claude Code | Tester budget/turn limits | adds `--max-turns <n> --max-budget-usd <n>` | result artifact plus JSON sidecar with cost/session evidence | `claude_testing_budget_turn_limit` |
| S20 | Claude Code | Resume session | adds `--resume <session_id>` | result artifact plus JSON sidecar preserving new session/cost fields | `claude_resume_session` |
| S21 | Claude Code | Continue last session | adds `--continue` | result artifact plus JSON sidecar | `claude_continue_session` |
| S22 | Claude Code | Project-context mode | `bare=false` omits `--bare` | result artifact plus JSON sidecar | `claude_non_bare_project_context` |
| S23 | Claude Code | Provider executable override | uses descriptor `providerCli.claude_code` argv prefix | result artifact plus JSON sidecar | `claude_provider_argv_override` |
| S24 | Claude Code | Cost/session sidecar | same as selected scenario | JSON sidecar keeps `session_id`, `cost_usd`, `duration_ms`, `num_turns` | `claude_json_sidecar_cost_session` |
| S25 | Claude Code | Default limits | no explicit options | defaults to `--max-turns 10 --max-budget-usd 0.5` | `claude_default_limits` |
| S26 | Claude Code | Invalid or elevated permission mode | adapter rejects before subprocess | diagnostic `claude_code_invalid_permission_mode`; includes `bypassPermissions` in normal automatic path | `claude_invalid_permission_mode`, `claude_bypass_permissions_rejected` |
| S27 | Claude Code | Nonzero provider exit | subprocess returns nonzero | diagnostic `claude_code_cli_nonzero`; executor reports non-pass | `claude_nonzero` |
| S28 | Claude Code | Missing provider executable | subprocess raises `OSError` | diagnostic `claude_code_cli_unavailable`; executor promotes to `tool_unavailable` | `claude_unavailable`, harness unavailable probe |
| S29 | Claude Code | JSON parse failure | stdout is not JSON | diagnostic `claude_code_json_parse_failed` | `claude_json_parse_failed` |
| S30 | Claude Code | Empty result | JSON lacks non-empty `result` | diagnostic `claude_code_cli_empty_output` | `claude_empty_result` |

## Result-Recovery Rules

- Codex normal recovery is `--output-last-message <artifact>`, with a safe metadata
  sidecar written by the adapter. Raw provider stdout/stderr are not forwarded as
  normal evidence.
- Claude Code normal recovery is JSON stdout parsing. The adapter writes `result` to the
  declared artifact and stores the full JSON response as a sidecar.
- Implementation/file-change recovery is executor-owned. A worker may change files only
  under declared `allowedChangeRoots`; the envelope records `worktree_changes`.
- Provider executable overrides are rejected unless the first executable is listed in
  `approvedProviderExecutables`; default `codex` and `claude` command names remain the
  policy-selected provider defaults.
- `danger-full-access` and Claude `bypassPermissions` are not normal automatic delivery
  settings. They require a separate elevated policy and approval path outside these
  adapters.
- If secret-like or root-path material appears in stdout/stderr or worker artifacts, the
  run is blocked and normal stdout/stderr/artifact evidence files are redacted.
- Missing provider executables are not product failures when the provider is not
  installed. They are recovered as `tool_unavailable` with provider-specific diagnostic
  evidence.
- Fixture and captured-output paths remain recovery/debug only and cannot satisfy
  `deliveryLoopReadiness=automatic_execution_pass`.

## Live Verification

- `codex --version`: `codex-cli 0.142.5`.
- Claude Code CLI install check after user PATH guidance:
  `C:\Users\user\.local\bin\claude.exe`, version `2.1.197 (Claude Code)`.
  No authenticated Claude worker execution was attempted because no Claude account is
  configured for this PC.
- Live Codex built-in adapter route: copied starter under `C:\tmp`, ran
  `conductor-worker-e2e --mode automatic` with Developer and Reviewer both routed to
  Codex through `workerPrompts`; result `automatic_execution_pass`,
  `deliveryLoopReadiness=automatic_execution_pass`, `productizationEvidence=true`, and
  `nextRoute=Tester`.
- Live Codex adapter scenario run: executed seven safe scenarios against real
  `codex-cli 0.142.5` under `C:\tmp\pkt27-live-codex-scenarios-final-*`.
  `S01-read-only-final`, `S02-workspace-write-no-edit`, `S05-json-required`,
  `S06-json-events`, `S07-ignore-rules`, `S08-on-request-boundary`, and
  `S10-metadata-sidecar` all returned `exitCode=0`, created the requested artifact,
  created the metadata sidecar, and had no Python traceback/UnicodeDecodeError after
  final security remediation.
- Live Claude unavailable route was run before the PATH correction by routing to an
  intentionally missing executable; result `status=tool_unavailable`,
  `realCliEvidenceStatus=tool_unavailable`, diagnostic `claude_code_cli_unavailable`.
  After PATH correction, only `claude --version` was run.

## Verification Commands

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"
```

Result: all passed after adapter flag-position correction.
