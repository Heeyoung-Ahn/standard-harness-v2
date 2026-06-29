# Packet Exit Quality Gate

이 문서는 구현이 끝난 packet을 close할 때 사용하는 표준 `packet closeout reference`다. packet은 이 문서 또는 동등하게 승인된 artifact 없이 완료 또는 close 상태로 올라가지 않는다.

## Approval Rule
- 구현이 끝난 packet은 이 문서 또는 승인된 동등 artifact를 먼저 작성하고 packet에 경로를 인용한다.
- implementation delta summary, source parity status, residual debt / refactor disposition, validation / security / cleanup evidence, exit recommendation이 비어 있으면 `approved`로 올리지 않는다.
- packet closeout의 exact enum fields에는 설명 문장을 넣지 않는다. `Source parity result`, `Validation / security / cleanup evidence`, `Exit recommendation` 같은 structured field에는 canonical enum만 쓰고, 근거 설명은 packet `Closeout notes`나 `REVIEW_REPORT.md`에 둔다.
- `npm run harness:packet-preflight -- --stage closeout --work-item WORK_ITEM_ID`는 field name, current value, expected enum values, narrative destination을 짧게 보여 준다.
- documentation impact, docs parity status, and system context conformance must be explicit when the packet changes operator instructions, API/runtime contracts, system boundaries, integrations, shared modules, or known hotspots.
- when a packet declares developer-documentation impact, `Docs parity status: pending` or `Docs parity status: fail` blocks closeout unless Planner records an approved follow-up/defer disposition.
- docs parity does not replace Developer implementation evidence, Tester verification, Reviewer closeout, Planner closeout, product acceptance, or release/cutover approval.
- long-context and memory impact must be explicit when the packet changed context artifacts, packet templates, closeout gates, workflows, architecture boundaries, domain/source truth, project history, or preventive memory guidance.
- independent `packet_doc_review` evidence must be present and passed before `Ready For Code`; closeout stays on hold if it is missing, failed, pending, self-reviewed, or does not cover requirements direction, implementation-plan sequencing, architecture/source SSOT, acceptance strength, verification scope, and v1.0/v2.0 operating philosophy.
- If the packet required `Planner Packet Challenge Review`, closeout stays on hold when the challenge review is missing, failed, pending, self-approved by the packet author, missing source refs/findings disposition, or has unresolved required corrections.
- closeout requires risk-adaptive independent review-lens evidence. Docs-only / low-risk fast-path closeout requires at least one independent behavior-verification lens and explicit N/A rationale/evidence for omitted lenses. High, critical, security-sensitive, release-sensitive, browser-facing, harness-system, starter-promotion, core, load-bearing, contract, or release closeout requires all four independent review lens agents: `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`. Missing, duplicated-agent, self-reviewed, unbound, stale, untrusted, failed, unresolved, or file-existence-only lens evidence blocks closeout.
- source parity status 또는 validation / cleanup status가 `unknown`이거나 unresolved UX / topology / schema confusion이 남아 있으면 packet closeout hold를 유지한다.
- closeout stays on hold when required long-context status is `unknown`, `stale`, unsupported, or `rebaseline-required` without Planner disposition.
- core는 closeout criteria와 decision shape만 제공한다. project-specific bug list, code diff, one-off cleanup step은 packet이나 상세 운영 문서에서 닫는다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Packet scope | [작업 이름] | [어떤 packet을 닫는지] | draft |
| Source parity | aligned / drift / unknown | [packet과 결과물 일치 여부] | draft |
| Residual debt | none / deferred / follow-up-open / unknown | [남는 부채 상태] | draft |
| UX conformance | not-needed / aligned / approved-deviation / unknown | [user-facing 기준 결과] | draft |
| Topology / schema conformance | not-needed / aligned / confusion-open / unknown | [환경/데이터 기준 결과] | draft |
| System context conformance | not-needed / aligned / stale / unknown | [시스템 경계/연동/공유 모듈 기준 결과] | draft |
| Documentation impact | none / updated / follow-up-open / unknown | [manual/docs 반영 필요 여부] | draft |
| Memory impact | none / updated / follow-up-open / unknown | [long-context / compaction / preventive memory 반영 여부] | draft |
| Validation / cleanup status | complete / partial / unknown | [검증/정리 상태] | draft |
| Exit recommendation | approve / adjust / hold | [packet close 가능 여부] | draft |

## Exact Packet Enum Reference

아래 값은 packet `## 15. Packet Exit Quality Gate`의 structured closeout field에 쓰는 exact enum이다.

| Packet field | Expected enum |
|---|---|
| `Packet exit quality gate reference` | `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md` |
| `Exit recommendation` | `approved` / `hold` / `rejected` / `pending` |
| `Source parity result` | `pass` / `fail` / `pending` / `not-needed` |
| `Validation / security / cleanup evidence` | `pass` / `fail` / `pending` / `not-needed` |

`none planned.`, `aligned with packet`, `complete after tests`, 같은 설명 문장은 exact enum field에 쓰지 않는다.
그 설명은 `Closeout notes`, Tester walkthrough, 또는 Reviewer report에 기록한다.

Copy-ready closeout metadata example:

- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Exit recommendation: approved
- Source parity result: pass
- Validation / security / cleanup evidence: pass
- Closeout notes: root/starter parity, tests, validation, and review evidence are summarized here.

## 1. Goal And Reviewed Scope
- Goal:
- Reviewed implementation scope:
- Out-of-scope remainder:

## 2. Implementation Delta Summary
- What changed:
- What stayed unchanged:
- Canonical docs updated:

## 3. Source Parity Check
- Packet vs code parity:
- Packet vs canonical docs parity:
- Packet vs generated docs / active context parity:
- Source trace gaps:
- Packet doc review status:
- Packet doc review evidence path:
- Packet doc reviewer independence:
- Planner Packet Challenge Review status:
- Challenge reviewer independence / source refs / findings disposition:

## 3A. Independent Review Lens Evidence
| Lens | Independent Agent | Evidence Path | Status | Findings | Limitations | Reviewer Disposition |
|---|---|---|---|---|---|---|
| challenge_review |  |  | pending / pass / pass_with_findings / block / not-applicable |  |  |  |
| adversarial_security_review |  |  | pending / pass / pass_with_findings / block / not-applicable |  |  |  |
| code_quality_review |  |  | pending / pass / pass_with_findings / block / not-applicable |  |  |  |
| evidence_review |  |  | pending / pass / pass_with_findings / block / not-applicable |  |  |  |

- Lens N/A rationale path:
- Duplicated/self-review check:

## 4A. Memory Impact Review
- Long-context update needed: yes / no
- Context artifacts updated:
- Context artifacts intentionally not updated:
- Preventive memory impact: none / candidate / triage-needed
- Compaction needed: yes / no
- Compaction trigger:
- Preserved invariants:
- Archive / citation path:
- Documenter route needed: yes / no
- Closeout hold: hold if required long-context status is unknown, stale, unsupported, or `rebaseline-required` without Planner disposition.

## 4. Residual Debt And Refactor Disposition
- Refactor completed:
- Residual debt:
- Deferred cleanup:
- Follow-up item:

## 5. UX / Behavior Conformance
- User-facing impact:
- Archetype / behavior conformance result:
- Approved deviation reference:

## 6. Topology / Schema / Operations Conformance
- Data or schema confusion:
- Topology or cutover confusion:
- Migration / rollback note:
- System boundary / integration / hotspot conformance:
- System context update status:
- Modeling error handling:
  - none-found / stopped-and-remodeled / patched-around-blocked / not-needed
  - ordinary bug means a local implementation defect that does not change the approved model.
  - modeling error means the approved model, API contract, component responsibility, dependency direction, data ownership, or public contract was wrong or incomplete.
  - for core or load-bearing work, patched-around modeling error is a blocking closeout result unless Planner updated the model or packet boundary before implementation continued.
  - discarding incorrect generated work is a successful quality outcome when it prevents load-bearing slop.

## 7. Validation / Security / Cleanup Evidence
- Tests and validator:
- Security review result:
- Docs / artifact cleanup:
- Documentation impact:
- Docs parity status:
- Operator/manual update needed:
- Developer documentation impact:
- Required developer doc paths:
- Docs parity closeout disposition:
- Dependency / script cleanup:

## 8. Deferred Items And Reopen Triggers
- Deferred item:
- Why deferred:
- Reopen trigger:

## 9. Human Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Packet closeout approved | yes / no | [owner] | pending | [exit recommendation] |
| Residual debt accepted | yes / no | [owner] | pending | [defer / follow-up item] |
| Security review acknowledged | yes / no | [owner] | pending | [finding status] |
| Documentation impact accepted | yes / no | [owner] | pending | [docs parity / follow-up status] |

## 10. Final Decision
- Exit recommendation:
- Next action:
