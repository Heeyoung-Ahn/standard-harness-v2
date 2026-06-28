# Root Independent Packet And Closeout Review Gates Artifact Sync

## Trigger
- Human Owner direction: all packets must use independent review agents so implementation LLMs cannot narrow Planner-approved intent, finish superficially, or skip Planner closeout.
- Additional Human Owner direction: packet documents themselves must be independently reviewed against requirements direction before Ready For Code, for both root-harness v1.0 and starter-payload v2.0 packets.

## Updated Surfaces
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/planner.md`
- `.agents/workflows/orchestrator.md`
- `.agents/workflows/reviewer.md`
- `reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `.harness/runtime/state/packet-preflight.js`
- `.harness/test/packet-preflight.test.js`

## Contract Change
- Every packet must pass independent `packet_doc_review` before Ready For Code.
- Every packet closeout must include four independent closeout review lens agents:
  `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`.
- Developer, Tester, Orchestrator, Planner, generated summaries, duplicated agents, and main-session self-review cannot satisfy those independent review gates.
- Missing, failed, pending, self-reviewed, duplicated-agent, or unbound review evidence blocks the relevant transition or closeout.

## Verification
- `node --test .harness/test/packet-preflight.test.js`

