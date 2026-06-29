# PKT-14 Fixture E2E Evidence

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Scope: copied-starter `conductor-worker-e2e` fixture mode
- Command: `python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-14 --mode fixture`
- Exit code: 0
- Status: pass

## Result Summary
- JSON contract schema: `standard-harness-conductor-worker-e2e/v1`
- Packet: `PKT-14`
- Mode: `fixture`
- Selected route: `cross_llm_worker_verifier`
- Worker run: `codex-cli-local` as `Developer`, `truthClaim=false`
- Verifier run: `claude-code-local` as `Reviewer`, `truthClaim=false`
- Output envelopes: worker and verifier envelope JSON files were written under `_ops/evidence/PKT-14/conductor-worker-e2e/`
- Real CLI evidence status: `not_applicable`
- Authority boundary: `approvalStateMutationAllowed=false`
- Next route: `Tester`

## Notes
- Fixture mode does not claim real Codex CLI or Claude Code CLI execution.
- The command generated resettable `_ops` evidence in the starter runtime. Root `.gitignore`
  excludes `starter/standard-harness/_ops/` so generated runtime evidence is not committed
  into the reusable starter payload.
