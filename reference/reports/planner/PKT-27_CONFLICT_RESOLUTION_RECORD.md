# PKT-27 Conflict Resolution Record

- conflictId: `CFR-20260701-conductor-worker-executor`
- conflictType: `scope_or_ssot_conflict`
- detectedBy: `planner`
- blockedMutation: `yes`
- sourcesRead:
  - `.agents/runtime/ACTIVE_CONTEXT.json`
  - `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
  - `.agents/workflows/planner.md`
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/packets/PKT-14_CONDUCTOR_WORKER_E2E.md`
  - `reference/packets/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md`
  - `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
  - `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`
  - `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- winningAuthority: `User / Planner`
- chosenRoute: `planner`
- refusedRoute: `developer implementation before RFC`
- routeReason: The User explicitly rejected the manual/captured-output interpretation and
  required 100% implementation of automatic Conductor-led orchestration, while Active
  Context and the operating contract prohibit implementation until a new packet, independent
  packet reviews, and explicit Ready For Code approval exist.
- requiredSsot:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- evidencePaths:
  - `reference/reports/artifact-sync/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- approvalBoundary: Planning artifacts may be updated under Planner authority. Implementation,
  testing, real provider execution, approval-state mutation, release, publish, starter
  promotion, residual-risk acceptance, User UAT, and productization-complete remain blocked.
- doNotCross: Do not edit starter runtime code or mark RFC approved until independent
  Planner Packet Challenge Review, independent `packet_doc_review`, and explicit RFC
  approval are recorded.
- nextFirstAction: Route independent packet challenge and packet-document review for PKT-27,
  then request explicit Ready For Code approval if both pass.
