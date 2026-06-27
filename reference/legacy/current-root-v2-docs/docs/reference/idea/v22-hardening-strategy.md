# V2.2 Project Operating Harness Strategy

## Document Relationship

- Master plan: `V2.1 Hardening Master Plan.md`.
- V2.1 disposition: reference only; do not implement as part of V2.1 release hardening.
- V2.2 role: long-range operating model for planning, design projection, delivery, review governance, knowledge continuity, and improvement loops.
- Inputs from V2.1: Review Governance Gate, Wiki Knowledge Architecture, HR-200 metrics, and executable release gate.
- Related V2.2 prompts: `Planning Pipeline Hardening.md` and `Design Planning Hardening.md`.

---

## 1. V2.2 목적

V2.2의 목적은 V2.1의 evidence-driven delivery kernel을 확장하여, 중형 이상 프로젝트를 운영할 수 있는 Project Operating Harness로 발전시키는 것이다.

V2.1은 packet, evidence, claim, gate, closeout, wiki, skill routing, conformance를 중심으로 단일 작업 단위의 검증 체계를 강화한다.

V2.2는 여기에 다음 능력을 추가한다.

1. 기획 의도 포착
2. 요구사항 정규화
3. 설계 projection
4. packet 기반 구현 통제
5. 리뷰 governance
6. 장기 지식 보존
7. 개선 루프

핵심 목표는 다음이다.

```text
사용자의 의도
→ 구조화된 기획
→ 검증 가능한 요구사항
→ 재사용 가능한 설계 projection
→ evidence-driven 구현
→ release-blocking review
→ provenance 있는 장기 기억
→ 반복 개선
```

## 2. V2.2 핵심 운영 모델

V2.2 Project Operating Harness는 다음 7개 layer로 구성한다.

## 2.1 Intent Capture

목적:
사용자의 초기 의도, 문제, 제약, 비목표, 가정, 미결정을 구조화한다.

포함 요소:

* Requirements interview
* PRD
* Non-goals
* Assumptions
* Open decisions

주요 산출물:

* requirements interview record
* PRD draft
* non-goal register
* assumption register
* open decision register
* stakeholder / role map
* success criteria

핵심 원칙:

* PRD와 인터뷰 문서는 planning projection이다.
* PRD Markdown은 source of truth가 아니다.
* 요구사항은 structured requirement candidate로 정규화되고, 이후 promotion을 거쳐야 enforceable requirement가 된다.

필요 skill 후보:

* SKILL-REQUIREMENTS-INTERVIEW
* SKILL-PRD-WRITING
* SKILL-NON-GOAL-EXTRACTION
* SKILL-ASSUMPTION-RISK-MAPPING
* SKILL-OPEN-DECISION-TRACKING

## 2.2 Specification Normalization

목적:
기획 산출물을 구현 가능한 구조로 정규화한다.

포함 요소:

* Feature tree
* Workflow / user-flow
* Requirement candidates
* Acceptance criteria

주요 산출물:

* feature tree
* workflow diagram
* user-flow diagram
* sequence/state diagram
* requirement candidate matrix
* acceptance criteria map
* requirement-to-packet split proposal

핵심 원칙:

* requirement candidate는 아직 canonical requirement가 아니다.
* enforceable requirement가 되려면 `_harness/contracts/**`, policy, schema, validator, test, HR coverage에 연결되어야 한다.
* workflow/user-flow는 Mermaid 같은 local text-based format을 기본으로 사용한다.
* 모든 flow는 flow ID, entry point, success path, failure path, role, related requirement candidate, evidence target을 가져야 한다.

필요 skill 후보:

* SKILL-FEATURE-SPEC-DECOMPOSITION
* SKILL-FLOW-MODELING
* SKILL-PRD-TO-VERIFIABLE-REQUIREMENTS
* SKILL-ACCEPTANCE-CRITERIA-NORMALIZATION
* SKILL-REQUIREMENT-PROMOTION-REVIEW

## 2.3 Design Projection

목적:
정규화된 요구사항과 workflow를 구현 가능한 UI/UX 설계 projection으로 전환한다.

포함 요소:

* Wireframe
* UI module contract
* Design mockup contract
* Browser validation expectation

주요 산출물:

* screen projection
* wireframe projection
* UI module contract
* design mockup contract
* reusable module registry
* design-to-browser validation handoff

핵심 원칙:

* wireframe, mockup, design artifact는 projection이다.
* design artifact는 requirements, policy, accessibility constraint, gate outcome을 override할 수 없다.
* 공통 UI module은 한 번 설계하고 contract로 lock한 뒤 재사용한다.
* 구현은 browser validation에서 screen/module coverage와 required states를 검증할 수 있어야 한다.

필요 skill 후보:

* SKILL-WIREFRAME-PROJECTION
* SKILL-DESIGN-MOCKUP-SYSTEMIZATION
* SKILL-UI-MODULE-CONTRACT-VALIDATION
* SKILL-DESIGN-TO-BROWSER-VALIDATION-HANDOFF

## 2.4 Delivery Packet

목적:
기획과 설계를 실제 구현 작업 단위로 전환하고, evidence-driven 방식으로 완료를 증명한다.

포함 요소:

* Packet
* Evidence
* Claim
* Gate
* Closeout

주요 산출물:

* packet
* test plan
* evidence record
* claim ledger
* gate result
* closeout decision
* closeout report

핵심 원칙:

* Issue/Ticket은 Packet에 대응한다.
* Acceptance Criteria는 Requirement + Acceptance Criterion으로 관리한다.
* Test Result / CI Log는 Evidence로 등록한다.
* “이 요구사항을 만족했다”는 주장은 Claim으로 기록한다.
* PR checks / quality checks는 Gate Result로 기록한다.
* Done decision은 Closeout으로 결정한다.
* closeout은 supported claim, trusted evidence, passing gate, review decision, boundary/security/drift 조건을 종합해 결정한다.

V2.1에서 이미 구현된 기반:

* PacketService
* EvidenceService
* GateService
* ValidationService
* CloseoutService
* V21ConformanceGate

V2.2 확장 후보:

* packet dependency
* lock scope
* parallel workspace metadata
* workstream / epic / release membership
* migration order
* release train integration

## 2.5 Review Governance

목적:
구현 후 리뷰 품질을 release-blocking gate로 통제한다.

포함 요소:

* Review profile
* Review bundle
* Finding
* Evidence integrity
* Final adjudication

주요 산출물:

* review profile
* review bundle
* review finding
* evidence integrity report
* review adjudication
* release self-test result

핵심 원칙:

* 리뷰는 Markdown 문서가 아니라 structured evidence gate이다.
* AI review는 advisory일 수 있으나 release authority가 될 수 없다.
* deterministic evidence, test log, real commit, final adjudication이 필요하다.
* unresolved P0 finding은 release를 차단한다.
* conditional pass는 final adjudication이 있어야 한다.
* release gate는 broken fixture를 실제로 차단해야 한다.

V2.1 XP-10B에서 구현할 기반:

* review profile policy
* review bundle schema
* review finding schema
* review evidence integrity validator
* review adjudication validator
* release self-test validator

V2.2 확장 후보:

* reviewer assignment
* reviewer workload balancing
* review dashboard
* review quality metrics
* review prompt generation
* multi-agent review orchestration

## 2.6 Knowledge Continuity

목적:
프로젝트가 장기화되어도 결정, 예외, 맥락, 시행착오, 교정 사항을 보존한다.

포함 요소:

* Wiki skeleton
* Provenance
* Skill-facing index
* Freshness
* Correction harvesting

주요 산출물:

* wiki page
* wiki index
* skill-facing index
* provenance footer
* freshness status
* correction/friction signal
* wiki proposal
* validated wiki apply result

핵심 원칙:

* Wiki는 source of truth가 아니라 validated projection / navigation layer이다.
* Wiki는 canonical requirement, policy, schema, validator, gate, trusted evidence, human decision을 override할 수 없다.
* 모든 trusted Wiki/reference page는 source tier, freshness, owner, evidence, related HR/XP/packet, review status를 가져야 한다.
* stale context는 trusted context로 승격될 수 없다.
* user correction, reviewer finding, gate failure, stale-doc finding은 friction/improvement loop로 연결되어야 한다.

V2.1 XP-05B에서 구현할 기반:

* wiki skeleton validator
* provenance footer model
* projection-only authority validator
* skill-facing index projection boundary
* mapping-based freshness validation
* stale/missing provenance friction signal

V2.2 확장 후보:

* full context pack integration
* knowledge dashboard
* automated correction harvesting
* wiki update recommendation
* role-based knowledge routing

## 2.7 Improvement Loop

목적:
반복되는 문제를 하네스 개선으로 연결한다.

포함 요소:

* Friction
* Metrics
* Improvement candidate
* Starter promotion

주요 산출물:

* friction signal
* metric signal
* recurring friction report
* improvement candidate
* harness improvement packet
* starter promotion candidate
* success metrics report

핵심 원칙:

* 하네스는 단순 검증 도구가 아니라 개선 루프를 가져야 한다.
* 반복 실패, 반복 혼동, 누락된 evidence, stale context, review failure, design drift는 friction signal로 기록한다.
* 개선 후보는 evidence, metric, packet closeout과 연결되어야 한다.
* starter promotion은 검증된 개선만 반영한다.

V2.1 기반:

* friction signal schema
* metric signal schema
* HR-200 metrics
* starter promotion candidate
* compound engineering coverage

V2.2 확장 후보:

* portfolio-level improvement dashboard
* team/process metrics
* recurring issue trend
* cost/time/quality correlation
* process bottleneck detection

## 3. V2.2에 추가할 중형 이상 프로젝트 운영 기능

V2.2에서는 7개 layer 외에 중형 이상 프로젝트 운영을 위해 다음 기능을 추가 검토한다.

### 3.1 Portfolio / Workstream / Release 계층

필요성:
Packet 단위만으로는 중형 이상 프로젝트 전체 현황을 보기 어렵다.

추가 개념:

* Program
* Product
* Release
* Workstream
* Epic
* Capability
* Packet

필요 validator:

* release-scope-validator
* workstream-progress-validator
* packet-release-membership-validator
* critical-path-validator

### 3.2 Packet Dependency / Lock / Workspace

필요성:
여러 packet이 동시에 진행될 때 파일, DB, API, schema 충돌을 막아야 한다.

추가 개념:

* dependsOn
* blocks
* lockScope
* workspace
* baseCommit
* branch
* migrationOrder

필요 gate:

* dependency-gate
* workspace-lock-gate
* merge-conflict-risk-gate
* migration-order-gate

### 3.3 RACI Ownership Model

필요성:
중형 이상 프로젝트에서는 누가 승인하고, 누가 risk를 accept하고, 누가 release를 멈출 수 있는지 명확해야 한다.

주요 역할:

* Product Owner
* Packet Owner
* Tech Lead
* Reviewer
* Security Reviewer
* QA Owner
* Release Manager
* Wiki Applier
* Harness Admin
* Human Decision Owner

필요 gate:

* ownership-completeness-gate
* accepted-risk-authority-gate
* non-overridable-decision-gate

### 3.4 CI / PR / Branch Protection Integration

필요성:
CLI를 사람이 직접 실행하는 방식만으로는 팀 운영에서 누락이 발생할 수 있다.

추가 연동:

* PR check
* CI artifact evidence auto-registration
* branch protection
* commit mapping
* release tag artifact
* status check integration

필요 gate:

* pr-packet-link-gate
* ci-evidence-registration-gate
* branch-protection-gate

### 3.5 Release Train / Environment Promotion / Rollback

필요성:
release readiness만으로는 실제 운영 배포를 관리하기 어렵다.

추가 개념:

* release candidate
* staging promotion
* production approval
* migration dry run
* rollback plan
* post-deploy verification
* feature flag

필요 gate:

* environment-promotion-gate
* migration-dry-run-gate
* rollback-readiness-gate
* production-smoke-gate
* post-release-monitoring-gate

### 3.6 Operational Observability

필요성:
운영 중 장애가 발생했을 때 packet, release, change, evidence와 연결해 원인을 추적해야 한다.

추가 개념:

* packetId in logs
* releaseId in logs
* requestId correlation
* validation duration metrics
* production health evidence
* incident link

필요 gate:

* observability-readiness-gate
* production-health-gate
* incident-linkage-gate

### 3.7 Evidence Store / Retention

필요성:
중형 이상 프로젝트에서는 test log, screenshot, browser trace, SQL result, security report, release archive가 커진다.

추가 개념:

* metadata in HarnessStore
* large artifact in ArtifactStore
* artifact URI
* sha256 checksum
* size
* classification
* retention class

필요 gate:

* evidence-artifact-integrity-gate
* retention-policy-gate
* sensitive-artifact-classification-gate

## 4. V2.2 단계별 구현 제안

### Phase 1. Planning / Specification Foundation

* Intent Capture schema
* Requirement interview record
* PRD projection schema
* Non-goal / assumption / open decision register
* Feature tree schema
* Flow metadata contract
* Requirement candidate normalization
* Planning artifact projection-only validator

### Phase 2. Design Projection Foundation

* Screen projection schema
* Wireframe projection schema
* UI module contract schema
* Design mockup contract schema
* Designer handoff projection
* Design artifact projection-only validator
* Browser validation expectation contract

### Phase 3. Project Operating Layer

* Program / Workstream / Release model
* Packet dependency / lock / workspace model
* RACI ownership model
* Release candidate membership
* Critical path / blocking packet detection

### Phase 4. Delivery / Review / Knowledge Integration

* Planning-to-packet trace
* Design-to-packet trace
* Review governance dashboard
* Wiki/context integration
* Correction harvesting workflow
* Friction/metric integration

### Phase 5. Release / Operation Layer

* CI/PR integration
* Environment promotion
* Migration dry run
* Rollback readiness
* Production smoke evidence
* Post-release monitoring
* Evidence artifact store / retention

## 5. V2.2 Definition of Done

V2.2 is complete only when:

1. User intent can be captured as structured planning artifacts.
2. PRD, feature tree, flow, and requirement candidates are traceable.
3. Planning artifacts cannot directly create release authority.
4. Requirement candidates can be promoted into enforceable requirements through controlled promotion.
5. Wireframes and design artifacts are projection-only and traceable to requirements/flows.
6. Reusable UI module contracts can be defined and validated.
7. Packet lifecycle can link back to planning and design artifacts.
8. Review governance is integrated with packet/release closeout.
9. Wiki knowledge architecture preserves provenance, freshness, and authority boundary.
10. Friction/metric signals connect planning, design, review, wiki, and delivery failures to improvement candidates.
11. Workstream/release/project-level visibility exists.
12. Packet dependency and lock conflicts can be detected.
13. RACI ownership is explicit.
14. Release candidate, environment promotion, rollback, and post-release monitoring are modeled.
15. Evidence artifacts have integrity, classification, and retention metadata.
16. V2.2 conformance gate passes.

## 6. V2.2 핵심 원칙

1. Planning and design artifacts are projections, not source of truth.
2. Canonical authority must remain structured and validator-consumable.
3. Every important artifact must have provenance, owner, freshness, and traceability.
4. Every release-blocking claim must be backed by trusted evidence.
5. Every review pass must be backed by real commits, logs, findings, and adjudication.
6. Every long-term memory item must declare authority level and canonical source.
7. Every repeated confusion or failure should become a friction signal.
8. Every improvement must be promoted through evidence-backed harness improvement flow.
9. Medium-scale project operation requires portfolio, ownership, dependency, release, and observability layers.
10. The harness should help LLMs implement correctly by improving planning quality, context quality, review strictness, and knowledge continuity.

