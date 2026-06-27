# PKT-01 Work Item Packet Template

> PLANNING PACKET. This file is the approved scope, approval boundary, and closeout evidence surface for one work item.

## Purpose
이 문서는 한 개의 구현 작업을 코드 착수 전에 다시 닫기 위한 task-level planning/design packet template이다. rough baseline 승인만으로 바로 구현하지 않게 하고, 특히 사용자가 직접 체감하는 `프로그램 기능과 UI/UX`는 인간과 충분히 협의한 뒤 구현하게 만드는 것이 목적이다.

## Approval Rule
- 이 packet은 구현 전에 작성한다.
- 이 packet은 먼저 `Core / Optional Profile / Project Packet` 중 어디에 속하는지 판정한다.
- 이 packet은 `light / standard / contract / release` 중 하나의 Gate profile을 선언하고 profile별 required evidence를 닫는다.
- one-or-more active optional profiles가 있으면 approved profile references와 required profile-specific evidence 없이는 `Ready For Code`로 올리지 않는다.
- declared optional profiles가 둘 이상이면 `Profile composition rationale`과 각 profile의 required evidence 합집합이 닫히기 전에는 `Ready For Code`로 올리지 않는다.
- `PRF-10` BI-heavy packet은 BI evidence staging을 `draft`, `approved`, `deferred-with-reason`, `not-needed` 중 하나로 기록한다. `draft`는 discovery/mock/prototype 임시 상태이고, `approved`만 BI-heavy `Ready For Code` 근거가 될 수 있으며, `deferred-with-reason`은 이유와 follow-up이 있어야 하고 이번 packet의 BI-heavy 구현 근거로 쓰지 않는다. `not-needed`는 PRF-10이 해당 packet 또는 evidence surface에 적용되지 않는다는 뜻이다.
- 사용자가 `orchestration workflow`로 end-to-end delivery를 명시하면, 구현 완료 후 `Tester verification`, `Reviewer closeout`, `Planner closeout after Reviewer approval`까지 같은 turn에서 마치는 것을 기본 기대값으로 기록한다. 중간에 멈출 수 있는 이유는 blocking evidence, missing required environment/evidence, 또는 explicit human approval blocker뿐이다.
- `프로그램 기능과 UI/UX`를 건드리는 작업은 human sync 또는 approval 없이는 `Ready For Code`로 올리지 않는다.
- user-facing 작업은 approved UX archetype reference와 selected archetype 선언 없이 `Ready For Code`로 올리지 않는다.
- user-facing 작업에서 UX deviation이 있으면 approved deviation rationale 없이는 `Ready For Code`로 올리지 않는다.
- deploy/test/cutover 작업은 approved environment topology reference 없이 `Ready For Code`로 올리지 않는다.
- deploy/test/cutover 작업에서 execution target 또는 rollback boundary가 `unknown`이면 `Ready For Code`로 올리지 않는다.
- data-impact 작업은 approved domain foundation reference 없이 `Ready For Code`로 올리지 않는다.
- system boundary, integration ownership, shared module, external dependency, or hotspot 영향이 있으면 system context reference와 impact 판단 없이 `Ready For Code`로 올리지 않는다.
- DB 설계가 있는 작업은 사용자 DB 설계 확인 없이 `Ready For Code`로 올리지 않는다.
- 기존 프로그램과 연동되면 기존 DB schema 또는 동등한 authoritative schema artifact를 먼저 확보하거나, 미확보 이유를 blocker로 올린다.
- 새 기획 문서, 정책, 연동 명세가 active work에 영향을 주면 approved authoritative source intake reference와 conflict / impact analysis 없이 `Ready For Code`로 올리지 않는다.
- 새 기획 문서를 접수하면 authoritative source impact와 충돌 분석을 먼저 다시 연다.
- 한 authoritative source change가 여러 open packet에 동시에 영향을 주면 approved `Authoritative source wave ledger reference`와 impacted packet set scope / packet disposition 없이는 `Ready For Code`로 올리지 않는다.
- high/critical effective risk, `core` 또는 `load-bearing` Change zone, `contract` 또는 `release` Gate profile, `strict-path`, explicit challenge-required declaration, broad deferred scope, or non-obvious parent objective coverage가 있으면 `Planner Packet Challenge Review`가 `pass`되기 전에는 `Ready For Code`로 올리지 않는다.
- `Planner Packet Challenge Review`는 구현물이 아니라 Planner가 작성한 packet 자체를 검토한다. parent objective coverage, deferred scope, acceptance strength, failure fixture, Reviewer closeout hold basis, first-wave objective avoidance, guidance-vs-runtime 수준을 닫는다.
- 구현 중 새 detail이 생기면 이 packet을 다시 열고 sync한 뒤 진행한다.
- 이 template로 만든 concrete packet을 `reference/packets/` 아래에 두면 같은 lane에서 `artifact_index`에 category `task_packet`으로 등록한다. 미등록이면 validator가 fail-fast 한다.
- exact enum field는 값만 기록하고 설명은 별도 note 필드에 쓴다. 예: `Schema impact classification: none`처럼 쓰고, 설명은 `Schema impact note:`에 기록한다. `none; 설명`처럼 한 줄에 섞으면 preflight/registration semantic check가 막아야 한다.
- strict literal enum은 공백과 문장부호까지 exact value로 본다. `Change zone`은 `core` / `load-bearing` / `padded` / `prototype`, `Schema impact classification`은 `none` / `not-needed` / `not needed` / `no` / `low` / `medium` / `high` / `conditional` 중 하나만 쓴다.
- 구현이 끝난 packet은 approved packet exit quality gate reference와 exit recommendation 없이 close하지 않는다.
- source parity status 또는 validation / cleanup status가 `unknown`이거나 unresolved UX / topology / schema confusion이 남아 있으면 packet closeout hold를 유지한다.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | [작업 이름] | [왜 지금 하는지] | draft |
| Ready For Code | approve / adjust / hold | [코드 착수 가능 여부 근거] | draft |
| Human sync needed | yes / no | [왜 필요한지] | draft |
| Gate profile | light / standard / contract / release | [필요한 검증 강도] | draft |
| Risk class | low / normal / high / critical | [declared risk; validator-derived risk may raise effective risk] | draft |
| Route class | fast-path / packet-path / strict-path | [작업 진입 방식; gate profile이 아님] | draft |
| Change zone | core / load-bearing / padded / prototype | [ownership-map 기반 변경 영역; Route class보다 blast-radius 판정에 가깝다] | draft |
| Delivery route mode | role-by-role / orchestrated-closeout | `role-by-role`은 lane마다 사람이 apply할 때, `orchestrated-closeout`은 승인된 bounded scope를 Developer -> Tester -> Reviewer -> Planner closeout까지 라우팅할 때 쓴다. | draft |
| User-facing impact | none / low / medium / high | [영향 영역] | draft |
| Layer classification | core / optional profile / project packet | [어디에 속하는지] | draft |
| Active profile dependencies | none / [profile ids] | [왜 필요한지] | draft |
| Profile evidence status | not-needed / pending / approved | [active profile-specific evidence 충족 여부] | draft |
| UX archetype status | not-needed / pending / approved | [user-facing 기준 충족 여부] | draft |
| UX deviation status | none / pending / approved | [기본 archetype에서 벗어나는지] | draft |
| Environment topology status | not-needed / pending / approved | [deploy/test/cutover 기준 충족 여부] | draft |
| Domain foundation status | not-needed / pending / approved | [data-impact 기준 충족 여부] | draft |
| System context status | not-needed / pending / approved | [system boundary / integration / hotspot 기준 충족 여부] | draft |
| Authoritative source intake status | not-needed / pending / approved | [source intake 기준 충족 여부] | draft |
| Shared-source wave status | not-needed / pending / approved | [multi-packet source wave rebaseline 여부] | draft |
| Packet exit gate status | pending / approved / hold | [closeout gate 준비 여부] | draft |
| Improvement promotion status | none / proposed / pending-review / approved / promoted | [반복 friction 승격 여부] | draft |
| Existing system dependency | none / possible / confirmed | [기존 프로그램 연동 여부] | draft |
| New authoritative source impact | none / pending / analyzed | [새 기획 문서 영향 여부] | draft |
| Risk if started now | low / medium / high | [남아 있는 모호성] | draft |
| Ship value status | pending / approved / hold | [사용자 가치와 인간 taste decision 닫힘 여부] | draft |
| Required reviewer profiles | qa-lead / cso / data-correctness / governance / staff-engineer / release-sre / ux-reviewer / automation-governor | [P2 reviewer-profile 결과] | draft |

## Lane-Typed Minimum Contract
- Lane-type declaration:
  [optional: declare exactly one of `planning`, `narrow-runtime`, `validation-review`, `release-security`; leave undeclared to keep the current full packet baseline]
- Lane-type universal minimum sections:
  [Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger]
- Lane-type required sections:
  [lane-type별로 반드시 닫아야 하는 section 또는 evidence surface]
- Lane-type conditional sections:
  [조건이 맞을 때만 닫는 section 또는 evidence surface]
- Lane-type not-needed sections:
  [이번 lane type에서 명시적으로 `not-needed` 처리하는 section 또는 evidence surface]

## 1. Goal
- [이 작업이 해결해야 하는 핵심 목표]

## 2. Non-Goal
- [이번 작업에서 하지 않을 것]

## 3. User Problem And Expected Outcome
- 현재 사용자가 겪는 문제:
- 작업 후 사용자가 체감해야 하는 변화:


## Ship Value Contract
- User-visible value:
- Business / operational value:
- Non-code outcome:
- Human taste decision:
- Ship decision: ship / hold / revise / not-needed
- Value evidence:

## 4. In Scope
- [이번 작업에 포함되는 기능]

## 5. Out Of Scope
- [이번 작업에 포함되지 않는 기능]

## 6. Detailed Behavior
- Trigger:
- Main flow:
- Alternate flow:
- Empty state:
- Error state:
- Loading/transition:

## 7. Program Function Detail
- 입력:
- 처리:
- 출력:
- 권한/조건:
- edge case:

## Modeling Impact
- Modeling impact status: required / promoted / not-needed
- Critical User Journey:
- API contract:
- Component responsibility:
- Allowed dependency direction:
- Data ownership:
- Public contract vs internal/scratch field:
- Promoted modeling artifact:
- Not-needed rationale:
- Changed-file / classification evidence:
- Field consolidation note:
  - Use this block to summarize CUJ, API, component boundary, dependency direction, data ownership, and public-contract decisions for `core` or `load-bearing` work.
  - If the same detail is already closed in domain/system/API/source fields below, cite or summarize it here instead of duplicating long prose.
  - Keep `padded` work light: use `not-needed` with a short rationale when no API, schema, auth, security, shared dependency, or public contract boundary is touched.
  - Promote to a separate artifact only for core/load-bearing decisions that span multiple packets or define a durable public contract.
  - If Developer discovers a modeling/API/component-boundary error, stop implementation and return to Planner before patching around it.

## Prototype Lane Contract
- Prototype sandbox path: not-needed / `prototypes/**` / separate repo / separate worktree
- Learning goal:
- Evidence type: not-needed / CUJ / UX / customer feedback
- Production-copy prohibition:
  - Prototype output is learning evidence only.
  - Production code must not directly copy, merge, import, symlink, or depend on prototype artifacts without Modeling Impact and product packet approval.
- Promotion target packet:
- Modeling Impact required: yes / not-needed
- Closeout boundary:
  - Prototype closeout may claim learning evidence.
  - Prototype closeout must not claim product verification, production readiness, release readiness, or reusable implementation approval.
- Reviewer hold basis:
  - Hold when sandbox path, learning goal/evidence type, production-copy prohibition, promotion target packet, or Modeling Impact requirement is missing.
  - Hold when wording permits direct copy/merge into production.

## 8. UI/UX Detailed Design
- Active profile references:
- Profile composition rationale:
- Profile-specific UX / operation contract:
- Primary admin entity / surface:
- Grid interaction model:
- Search / filter / sort / pagination behavior:
- Row action / bulk action rule:
- Edit / save / confirm / audit pattern:
- Profile deviation / exception:
- UX archetype reference:
- Selected UX archetype:
- Archetype fit rationale:
- Archetype deviation / approval:
- 영향받는 화면:
- 레이아웃 변경:
- interaction:
- copy/text:
- feedback/timing:
- source trace fallback:

## 9. Data / Source Impact
- Layer classification:
- Core / profile / project boundary rationale:
- Active profile dependencies:
- Profile-specific evidence status:
- Source spreadsheet artifact:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- Row key / record identity rule:
- Source snapshot / version:
- Transformation / normalization assumptions:
- Reconciliation / overwrite rule:
- Transfer package / bundle artifact:
- Transfer medium / handoff channel:
- Checksum / integrity evidence:
- Offline dependency bundle status:
- Ingress verification / import step:
- Rollback package / recovery bundle:
- Manual custody / operator handoff:
- Required reading before code:
- Environment topology reference:
- Source environment:
- Target environment:
- Execution target:
- Transfer boundary:
- Rollback boundary:
- Domain foundation reference:
- System context reference:
- System boundary impact:
- Shared module / hotspot impact:
- Schema impact classification:
- DB / state 영향:
- Markdown / docs 영향:
- Documentation impact:
- Docs parity needed:
- Operator/manual update needed:
- generated docs 영향:
- validator / cutover 영향:
- Harness validation / product verification boundary: harness validation checks structural/state consistency only; product/feature verification evidence remains Tester/Reviewer/product-specific acceptance.
- Authoritative source refs:
- Authoritative source intake reference:
- Authoritative source disposition:
- New planning source priority / disposition:
- Existing plan conflict:
- Current implementation impact:
- Required rework / defer rationale:
- Impacted packet set scope:
- Authoritative source wave ledger reference:
- Source wave packet disposition:
- Existing program / DB dependency:
- Existing schema source artifact:
- Table / column naming compatibility:
- Data operation / ownership compatibility:
- Migration / rollback / cutover compatibility:
- Product source root:
- Product test root:
- Product runtime requirements:
- Harness/product boundary exceptions:
- Legacy system source inventory:
- VBA module / macro / function inventory:
- MariaDB schema snapshot:
- Query / view / procedure / trigger inventory:
- Scheduled / manual operator steps:
- Current import / export / report paths:
- Source-of-truth ownership:
- Migration / reconciliation plan:
- Parallel-run / reconciliation evidence:
- Python / Django version policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Django project / module boundary:
- Django app / module boundary:
- Settings / environment policy:
- Migration policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Test convention:
- Static / media / admin customization boundary:
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Runtime / framework:
- Rendering / app mode:
- Data persistence boundary:
- Auth / user identity requirement:
- Deployment target:
- External API / integration boundary:
- Lightweight acceptance:
- Android package namespace:
- Kotlin / Java policy:
- Gradle / AGP version:
- minSdk / targetSdk:
- Signing policy:
- Build variants / flavors:
- Permissions policy:
- Local storage policy:
- Network security / API boundary:
- Navigation structure:
- Offline / sync policy:
- Notification policy:
- Privacy / data policy:
- Device / emulator test plan:
- Release channel:
- Package ownership policy:
- Node.js product runtime policy:
- Package manager:
- Framework / bundler:
- Build command:
- Test command:
- Environment variable policy:
- API / backend boundary:
- Static asset / routing policy:
- BI data source inventory reference:
- BI metric catalog reference:
- BI semantic model reference:
- BI refresh and lineage plan reference:
- BI dashboard governance reference:
- BI evidence staging status:
- Primary analytical subject area:
- Source-to-model mapping summary:
- Metric ownership and certification summary:
- Freshness / latency expectation:
- Access / role / row-filter rule:
- Reconciliation / backfill / rollback rule:

## Context Impact Classification
- Domain context: none / citation-only / subset-summary / update-required / rebaseline-required
- System context: none / citation-only / subset-summary / update-required / rebaseline-required
- Architecture: none / citation-only / subset-summary / update-required / rebaseline-required
- Project history: none / milestone / rebaseline / incident / durable-decision
- Preventive memory: none / candidate / triage-needed
- Required context paths:
- Context read level: none / cited-sections-only / full-artifact
- Context classification note:
  - Data, schema, source-intake, or existing-system impact cannot use `Domain context: none`.
  - Shared module, integration, external dependency, reusable workflow/runtime, or known hotspot impact cannot use `System context: none`.
  - Architecture boundary changes require `Architecture: update-required` or `Architecture: rebaseline-required`.
  - `rebaseline-required` blocks Developer transition and returns the packet to Planner.
  - `unknown`, `stale`, or unsupported context status blocks closeout or returns the packet to Planner.
  - Required context reads must start from cited sections; `full-artifact` reads require packet rationale.
  - Do not add unconditional full-artifact reads, default append-only logs, or a separate `*_SUMMARY.md` authority file.

## Development Documentation Impact
- Project overview impact: none / update-required
- Setup/dev environment impact: none / update-required / new-doc-required
- Architecture doc impact: none / cite-only / update-required / rebaseline-required
- Domain doc impact: none / cite-only / update-required
- API/interface doc impact: none / update-required / contract-required
- Database/data model doc impact: none / update-required / migration-note-required
- Module guide impact: none / update-required / new-doc-required
- Testing doc impact: none / update-required
- Deploy/operations doc impact: none / update-required / runbook-required
- History/decision doc impact: none / milestone / rebaseline / durable-decision
- Security/permission doc impact: none / update-required / review-required
- AI/automation doc impact: none / update-required
- Required doc paths:
- Docs must be updated before implementation: yes / no
- Docs must be updated before closeout: yes / no
- Docs parity status: not-needed / pending / pass / fail
- Development documentation note:
  - Simple UI text, filter, or narrow presentation tweaks can close with docs impact `none` when Reviewer agrees.
  - New source root, runtime command, setup command, or test command requires setup/dev environment documentation.
  - API, event, or DB contract changes cannot close with `Docs parity status: pending`.
  - Budget/workflow approval changes require domain, permission, workflow, and docs parity checks.
  - Planner owns overview, architecture, domain, API/DB/security baselines and rebaseline decisions.
  - Developer may update implementation parity docs only inside approved packet scope; baseline meaning changes return to Planner.
  - Docs parity does not replace Developer implementation evidence, Tester verification, Reviewer closeout, Planner closeout, or product acceptance.

## 10. Acceptance
- [사용자가 확인 가능한 acceptance 1]
- [사용자가 확인 가능한 acceptance 2]
- [검증 가능한 acceptance 3]

## Fast Path Note
- [optional for `Route class: fast-path`; first wave keeps this in packet/evidence text only]
- requested change:
- why low risk:
- data migration: no / yes
- auth/security: no / yes
- external API contract: no / yes
- release/deploy/cutover: no / yes
- schema change: no / yes
- workflow/validator authority: no / yes
- architecture or reusable runtime change: no / yes
- files changed:
- verification run:
- residual risk:
- follow-up needed:

## 11. Open Questions
- [아직 닫히지 않은 질문]

## Planner Packet Challenge Review
- Challenge reviewer: pending / independent planning reviewer / adversarial reviewer
- Challenge reviewer independence basis:
- Source refs reviewed:
- Challenge status: pending / pass / fail
- Parent objective coverage:
- Deferred scope with named follow-up:
- Acceptance proves behavior change:
- Failure fixture or failure condition:
- Reviewer closeout hold basis:
- First-wave limit check:
- Guidance-only sufficiency rationale:
- Required packet changes:
- Re-review evidence:
- Findings disposition:
- Required corrections applied:
- No self-approval claim:


## P2 Specialist Review Mode Contract
- Required reviewer profiles:
- Reviewer profile recommendation artifact: not-needed / .agents/runtime/reviewer-profiles/[work-item-id].json
- Mode review evidence:
- Mode conflict resolution:
- CSO mode required: yes / no
- Data correctness mode required: yes / no
- Governance mode required: yes / no
- Staff engineer mode required: yes / no
- Release/SRE mode required: yes / no
- UX reviewer mode required: yes / no

## 12. Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Layer classification agreement | yes / no | [owner] | pending | [core/profile/project 판정] |
| Optional profile evidence approval | yes / no | [owner] | pending | [profile paths / required evidence / composition] |
| Spreadsheet source mapping approval | yes / no | [owner] | pending | [workbook/sheet/range/header trace] |
| Airgapped transfer package approval | yes / no | [owner] | pending | [bundle / checksum / handoff] |
| Lightweight app baseline approval | yes / no | [owner] | pending | [runtime / deploy target / acceptance] |
| Android build and release boundary approval | yes / no | [owner] | pending | [namespace / SDK / signing / device test / release channel] |
| Node/frontend package boundary approval | yes / no | [owner] | pending | [package ownership / runtime / build / deploy] |
| Detailed function agreement | yes / no | [owner] | pending | [비고] |
| Detailed UI/UX agreement | yes / no | [owner] | pending | [비고] |
| UX archetype / deviation approval | yes / no | [owner] | pending | [reference path / selected archetype] |
| Environment topology approval | yes / no | [owner] | pending | [reference path / execution target] |
| Domain foundation approval | yes / no | [owner] | pending | [reference path / schema impact] |
| DB design confirmation | yes / no | [owner] | pending | [테이블/컬럼/데이터 운영 승인] |
| Authoritative source disposition approval | yes / no | [owner] | pending | [implemented / deferred / rejected-with-reason] |
| New source incorporation decision | yes / no | [owner] | pending | [신규 기획 문서 반영 범위] |
| Source wave rebaseline approval | yes / no | [owner] | pending | [multi-packet source wave일 때만 작성] |
| Packet exit quality gate approval | yes / no | [owner] | pending | [closeout reference / exit recommendation] |
| Improvement promotion decision | yes / no | [owner] | pending | [target layer / follow-up item] |
| Ready For Code sign-off | yes / no | [owner] | pending | [비고] |

## 13. Implementation Notes
- [구현 시 참고할 제약]

## 14. Verification Plan
- Gate profile:
- Risk class:
- Route class:
- Change zone:
- Delivery route mode:
  - `role-by-role`: start with `planner-to-developer`; use when humans need to inspect each lane before the next transition, manual verification pauses are expected, or scope confidence is still developing.
  - `orchestrated-closeout`: start with `planner-to-orchestrator`; use only after Ready For Code approval when bounded scope should route through Developer, Tester, Reviewer, bounded remediation, and Planner closeout unless blocked.
- Orchestration completion expectation:
- Remaining approval needed:
- Derived risk class:
- Effective risk class:
- Risk classification rationale:
- Critical human confirmation:
- Critical confirmation owner:
- Critical confirmation status:
- Critical confirmation evidence path:
- Post-transition refresh:
  - Run `npm run harness:sync-state` after state-changing transitions or closeout. If commands must be split manually, run `validate -> validation-report -> context -> status` sequentially.
- Verification manifest:
  - light: canonical artifact update, validator if generated/runtime state is touched, turn-close handoff note
  - standard: approved packet, targeted tests, validator, handoff evidence
  - contract: Planner Packet Challenge Review when required, Ready For Code, reusable asset sync, targeted tests, root test suite when applicable, starter test suite when applicable, validator, active context evidence when affected, review closeout
  - release: Planner Packet Challenge Review when required, release-baseline parity, packaging/manual evidence, validator, security/cutover evidence where applicable, review closeout
- Verification scenario reminder:
  - normal
  - error
  - permission
  - regression
  - manual check
  - evidence location
- Harness validation note: validator/validation-report pass is not product/feature verification pass; cite Tester/Reviewer/product-specific evidence separately.
- Context/memory note: `IMPLEMENTATION_PLAN.md` remains a cross-packet sequence and dependency surface, not a packet detail archive. Use packet evidence, canonical context docs, and closeout artifacts for detailed decisions; compact only when a packet records the trigger, cited source paths, preserved invariants, and archive/citation path.
- Docs/smoke packet note: keep `reference/manuals/human/HARNESS_MANUAL.md` as the primary human guide; keep `START_HERE.md` as the human start document; do not ship root maintainer history/evidence to `standard-template`; split if a new smoke fixture or install/copy execution flow grows; smoke evidence should name targeted docs/smoke tests, root full tests, starter full tests, validation-report, validate, status, and context when applicable.
- Packet preflight note: use `npm run harness:packet-preflight -- --work-item [id] --stage planning-open|implementation-transition|closeout` to preview effective risk, RFC enforcement, registration semantic-contract diagnostics, exact field enum diagnostics, and exact closeout enum diagnostics before transition or closeout.
- Planner Packet Challenge Review note: required challenge packets need `Challenge status: pass` and closed parent/deferred/acceptance/failure/hold/first-wave/guidance fields before implementation-transition. Planning-open may hold without blocking packet opening; implementation-transition blocks missing or non-pass challenge evidence.
- First-packet readiness note: before `npm run harness:first-packet -- --apply`, fix diagnostics for `Quick Decision Header > Work item`, open bootstrap decisions/risks, active profile evidence, and `## Verification Manifest`.
- Strict literal copy examples:
  - `Change zone: core`
  - `Schema impact classification: none`
  - `Schema impact note: no schema or state boundary changes`
- Verification Manifest compact example:
  - `- Ready For Code: approved`
  - `- root: targeted/full root checks`
  - `- standard-template: targeted/full starter checks`
  - `- targeted: packet-specific regression`
  - `- validator: harness validator pass`
  - `- active context: regenerated or not-needed`
  - `- review closeout: Reviewer report or not-needed`
- [어떻게 검증할지]


## TDD Evidence Contract
- TDD mode: required / exempt / not-applicable
- Red test file:
- Red command:
- Red exit code:
- Red failure kind: expected-behavior-failure / expected-regression-failure / expected-contract-failure / expected-test-failure
- Red ran at:
- Red output excerpt:
- Red output artifact:
- Red output sha256:
- Green command:
- Green exit code:
- Green ran at:
- Green output excerpt:
- Green output artifact:
- Green output sha256:
- Refactor verified: yes / no / not-needed
- Behavior-level test: yes / no
- Test-only production hook: no / yes
- Production code written first: no / yes
- Production-first remediation:
- TDD exception reason:
- TDD approved by:

## CSO Security Review
- Security review evidence status: pending / pass / approved / not-needed
- Security review evidence scope:
- Security review report path:
- Security review decision: pending / pass / pass_with_findings / block
- Security review mode: daily / comprehensive / scoped / diff / release
- Required CSO phases: 0,1,12,13,14
- Finding quality required: file,line,evidence_quote_redacted,confidence,phase,fingerprint,exploit_scenario,impact,recommendation
- Accepted-risk authority:
- Redaction status: raw-secrets-blocked / pending / not-needed
- Declared security/release paths:

## Parallel Execution Plan
- Parallel batch plan path:
- Parallel execution strategy: serial / parallel_shared / parallel_worktree
- File-overlap policy: serial_downgrade / require_worktree / block
- Baseline test evidence:
- Dependency graph status: cycle-free / pending / not-needed
- Worktree isolation evidence:
- Actual-file reconciliation:
- Merge order evidence:
- Merge-after-test evidence:
- Cleanup evidence:

## Compound Learning Closeout
- Compound learning mode: required / not-needed
- Compound solution note path:
- Solution schema identifier: standard-harness-learning-solution
- Solution track: bug / knowledge / workflow / data / security / architecture
- Source packet path:
- Verification command:
- Verification exit code:
- Related solution refs:
- Related solution overlap check: pass / update-existing / consolidate / pending
- Staleness check result:


## Review Evidence Pipeline
- Review scope artifact path:
- Review findings artifact path:
- Review base ref:
- Review head ref:
- Review mode: no-mutation / read-only
- Changed files from actual diff:
- Protected artifact deletion approval:
- Finding dedupe/fingerprint status:

## 50/50 Allocation Review
- Feature-building work:
- System-improvement work:
- Reusable learning captured:
- Automation or harness improvement candidate:
- Deferred system improvement:
- System improvement ledger reference: .agents/artifacts/SYSTEM_IMPROVEMENT_LEDGER.md

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved / hold / rejected / pending
- Packet exit metadata source parity result: pass / fail / pending / not-needed
- Packet exit metadata validation / security / cleanup evidence: pass / fail / pending / not-needed
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved / hold / rejected / pending
- Implementation delta summary:
- Source parity result: pass / fail / pending / not-needed
- Refactor / residual debt disposition:
- UX conformance result:
- Topology / schema conformance result:
- System context conformance result:
- Modeling error handling result: none-found / stopped-and-remodeled / patched-around-blocked / not-needed
- Documentation impact / docs parity result:
- Memory impact review:
  - Long-context update needed: yes / no
  - Context artifacts updated:
  - Context artifacts intentionally not updated:
  - Compaction needed: yes / no
  - Documenter route needed: yes / no
  - Archive / citation path:
  - Closeout hold: hold if required long-context status is unknown, stale, unsupported, or `rebaseline-required` without Planner disposition.
- Validation / security / cleanup evidence: pass / fail / pending / not-needed
- Deferred follow-up item:
- Improvement candidate reference:
- Proposed target layer:
- Promotion status / linked follow-up item:
- Closeout notes:

## 16. Reopen Trigger
- 아래 상황이 생기면 packet을 다시 연다.
- 사용자-facing detail이 새로 생김
- 상태 전이 또는 화면 구성이 바뀜
- acceptance가 달라짐
- 새 authoritative source 기획 문서가 들어옴
- shared-source wave ledger의 impacted packet set 또는 rebaseline status가 바뀜
- 기존 프로그램 연동 범위 또는 DB compatibility 판단이 바뀜
- active profile dependencies 또는 profile-specific contract가 바뀜
- workbook / sheet / tab / range trace 또는 header mapping이 바뀜
- transfer package, checksum evidence, offline bundle, or custody handoff가 바뀜
- source parity 또는 cleanup evidence 판단이 바뀜
- modeling error 발견 여부, stop/remodel 처리, 또는 patched-around 판단이 바뀜
- documentation impact, docs parity, or system context 판단이 바뀜
- 반복 friction의 promotion target이나 disposition이 바뀜
- human approval boundary가 바뀜
