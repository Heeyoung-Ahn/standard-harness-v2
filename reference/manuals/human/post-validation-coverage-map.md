---
doc_id: HUMAN_POST_VALIDATION_COVERAGE_MAP
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Post-Validation Coverage Map

이 문서는 실제 프로젝트 검증 이후 추가된 `PVH-FUP-001`부터 `PVH-FUP-009`까지의 개선 표면을 사람이 찾기 쉽게 묶은 map이다. 첫 실행은 `first-run-rehearsal.md`를 따른다. 이 문서는 기본 AI read set에 넣지 않고, post-validation 개선 흐름을 점검할 때만 사람이 연다.

## Post-Validation Operating Flow

1. `harness:directional-pilot`으로 방향 원칙 evidence lane을 확인한다.
2. `harness:trace-matrix`로 requirement -> packet -> file -> test -> evidence -> docs 연결을 확인한다.
3. `harness:operator-digest`로 readiness 요약과 다음 행동을 본다.
4. 필요하면 `harness:ai-review-runner`, `harness:refactor-audit`, `harness:recovery-rehearsal`, `harness:context-budget-policy`, `harness:packaging-readiness`를 각각 실행한다.
5. closeout에서는 product verification evidence, browser/security/reviewer evidence, trace/digest evidence를 분리해서 해석한다.

`operator-digest` is summary/navigation evidence only. The underlying gates remain authoritative: packet-preflight, transition, risk, guard, browser, security, trace, and closeout checks must still be read at their source.

`ready` is an evidence-surface status, not release readiness. `pass` is an evidence-surface status, not approval or product verification. Any row in this map does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance.

## Coverage Map

| Improvement ID | Operator question | When to run | Command surface | Classified representative command | Primary manual | Detailed reference | Expected evidence | Status interpretation | Verification test hook | Authority boundary | Source refs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PVH-FUP-001` | 방향 원칙 evidence lane이 채워졌는가? | follow-up wave나 closeout 전 | `harness:directional-pilot` | `preflight: npm run harness:directional-pilot -- --apply --evidence-file reference/evidence/fixtures/directional-pilot-completed-evidence.json` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/directional-regression-pilot.json` | `pass`, `warn`, `hold`, `block`은 evidence-surface status다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-001.md` |
| `PVH-FUP-002` | 요구사항이 test/evidence/docs와 연결됐는가? | requirement coverage를 설명해야 할 때 | `harness:trace-matrix` | `preflight: npm run harness:trace-matrix -- --apply --trace-file reference/evidence/fixtures/requirement-trace-matrix.json` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/requirement-trace-matrix.json` | missing row는 `warn` 또는 `hold` evidence다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-002.md` |
| `PVH-FUP-003` | AI review output이 advisory로 안전하게 해석되는가? | AI/Judge review를 참고 evidence로 쓸 때 | `harness:ai-review-runner` | `preflight: npm run harness:ai-review-runner -- --apply --review-file reference/evidence/fixtures/advisory-ai-review.json` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/advisory-ai-review.json` | finding disposition은 review evidence다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-003.md` |
| `PVH-FUP-004` | 여러 readiness surface의 다음 행동이 무엇인가? | closeout 전 상태를 한 화면에서 볼 때 | `harness:operator-digest` | `preflight: npm run harness:operator-digest -- --apply --digest-file reference/evidence/fixtures/operator-readiness-digest.json` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/operator-readiness-digest.json` | digest는 summary/navigation이고 source gate를 대체하지 않는다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-004.md` |
| `PVH-FUP-005` | 구조 부채나 refactor 후보가 누적됐는가? | 장기 작업 중 구조가 얽힐 때 | `harness:refactor-audit` | `preflight: npm run harness:refactor-audit -- --apply --mode strict` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/refactor-audit.json` | advisory는 non-blocking, strict는 severe finding을 hold evidence로 만들 수 있다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-005.md` |
| `PVH-FUP-006` | 첫 사용자가 한 페이지로 시작할 수 있는가? | copied starter를 처음 쓸 때 | `human/first-run-rehearsal.md` | `manual-only: npm run harness:init -- --non-interactive ...` | `human/first-run-rehearsal.md` | `human/getting-started.md` | `reference/manuals/human/first-run-rehearsal.md` | command classification은 실행 가능성 표시이지 approval이 아니다 | `template-health-docs.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-006.md` |
| `PVH-FUP-007` | recovery와 context budget이 report-first로 해석되는가? | generated state drift, retry, context overrun이 있을 때 | `harness:recovery-rehearsal`, `harness:context-budget-policy` | `preflight: npm run harness:context-budget-policy -- --apply --mode strict --role reviewer --lane strict --read-files 9 --tokens 2500` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/recovery-rehearsal.json` | strict hard-fail은 policy result이며 approval denial을 뜻하지 않는다 | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-007.md` |
| `PVH-FUP-008` | packaging/migration/version readiness evidence가 있는가? | 유지보수자 packaging 점검 때 | `harness:packaging-readiness` | `preflight: npm run harness:packaging-readiness -- --apply --readiness-file reference/evidence/fixtures/packaging-readiness.json` | `human/commands.md` | `reference/artifacts/V2_P2_CONDUCTOR_GUIDE.md` | `.agents/runtime/packaging-readiness.json` | `decision: ready` is evidence only, not release readiness | `v2-p2-conductor.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-008.md` |
| `PVH-FUP-009` | fresh copied starter에서 first-run rehearsal이 실제로 수렴하는가? | first-run manual fidelity를 검증할 때 | `harness:sync-state` | `executable: npm run harness:sync-state` | `human/first-run-rehearsal.md` | `human/getting-started.md` | `reference/manuals/human/first-run-rehearsal.md` | sync-state pass는 structural/state refresh evidence이며 product verification이 아니다 | `template-health-docs.test.js` | does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance | `.harness/packets/closed/PVH-FUP-009.md` |

## Reading Rule

이 map은 사람이 post-validation 개선 흐름을 찾기 위한 navigation 문서다. 명령 결과의 `ready`, `pass`, `hold`, `block`은 각 evidence surface의 상태이며, 승인이나 release 결정을 대신하지 않는다.

