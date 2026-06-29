# PKT-07 TDD GREEN Evidence

- Packet: `PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP`
- GREEN command: `PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\test\test_conductor_routing_loop.py`
- GREEN exit: 0
- GREEN result: 10 focused Conductor tests passed after remediation.
- Focused regression:
  - `PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\test\test_provider_neutral_orchestration.py`
  - exit 0; 13 tests passed, 1 skipped where Windows symlink creation was unavailable.
  - `PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\test\test_operating_folder_contract.py`
  - exit 0; 10 tests passed.
- Starter regression:
  - `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover starter\standard-harness\_harness\test`
  - exit 0; 69 tests passed, 1 skipped where Windows symlink creation was unavailable.
- Starter validation:
  - `PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter --installed-runtime`
  - exit 0; status `ok`.
- Root validation:
  - `npm run harness:validate` with bundled Node on PATH
  - packet artifact registration drift was repaired through the existing harness
    `artifact_index` store API for PKT-04B, PKT-05, PKT-06, and PKT-07.
  - `npm run harness:sync-state` exit 0; final technical validation pass with 0 blockers.
  - rerun `npm run harness:validate` exit 0; `ok: true`, `structuralReady: true`,
    `cutoverReady: true`, findings empty.
- Remediation coverage added after independent closeout lens findings:
  - queryable Conductor ledger/read-model events for selection, entry metadata,
    delegation grants, routing decisions, worker output refs, adjudication, and approval
    decisions.
  - replay allowlist for Conductor read-model events.
  - Human direct approval hard-stop checks and trusted human-decision requirement.
  - delegated approval prerequisite status must be `verified_by_harness`, not
    operator-reported booleans.
  - forged delegation grant rejection through trusted surface metadata.
  - explicit delegation lifecycle transition records.
  - full worker task envelopes and worker output refs.
  - adjudication records that remain evidence/read models.
  - adapter path validation now resolves real paths; symlink escape test added and skipped
    only when symlink creation is unavailable.
  - provider execution readiness now rejects unsafe command descriptors before CLI launch
    readiness is granted.
