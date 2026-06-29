# PKT-10 GREEN Evidence

- Packet: `PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION`
- Focused command: `PYTHONDONTWRITEBYTECODE=1 py -3 -m unittest starter\standard-harness\_harness\test\test_compound_feedback_promotion.py`
- Focused result: `11 tests`, `OK`
- Starter regression command: `PYTHONDONTWRITEBYTECODE=1 py -3 -m unittest discover starter\standard-harness\_harness\test`
- Starter regression result: `106 tests`, `OK (skipped=1)`
- CLI behavior command: `PYTHONDONTWRITEBYTECODE=1 py -3 starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root C:\tmp\<state> compound-feedback ...`
- CLI behavior result: `compound_feedback.status=ok`, `capturePolicy.status=pass`, durable signal recorded through `friction_signal_recorded`, metrics authority `operational-evidence-only`
- Copied-starter clean-export command: `PYTHONDONTWRITEBYTECODE=1 py -3 starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root C:\tmp\<state> starter-check --root C:\tmp\<copy>\standard-harness --clean-export`
- Copied-starter clean-export result: `status=ok`, `diagnostics=[]`, `validationMode=clean-export`
- Root validation command: bundled Node `.harness\runtime\state\harness-cli.js validate`
- Root validation result: `ok=true`, `structuralReady=true`, `cutoverReady=true`, `findings=[]`

## Behavior Covered

- Seed friction type and minimum runtime/service capture-surface enforcement.
- Evidence-required friction signal registry with unknown-type and missing-evidence rejection.
- Event-style friction signal output matches the public schema required shape.
- Runtime friction capture service records all seven minimum capture surfaces.
- Durable event-store-backed registry persists and replays separate signal occurrences for recurring detection.
- Recurring friction grouping by type, recurrence key, source surface, and evidence pattern.
- Proposal lifecycle from `proposed` to `accepted | deferred | rejected`.
- Wiki/long-memory candidate creation without direct wiki apply.
- Starter-promotion candidate lifecycle through `candidate -> dry-run -> approval-needed`.
- Missing manifest, missing dry-run, direct starter mutation, forged safety gate assertions, raw secrets, root paths, promoted status, and missing safety gates fail closed.
- Metrics summarize state but cannot approve promotion.
