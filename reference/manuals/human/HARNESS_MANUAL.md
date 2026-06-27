---
doc_id: HUMAN_HARNESS_MANUAL_INDEX
previous_doc_id: HUMAN_HARNESS_MANUAL_FULL
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
summary_for_llm: reference/manuals/operator/MANUAL_INDEX.md
canonical_human_manual: true
---
# Standard Harness Human Manual

이 문서는 사람 운영자를 위한 한국어 매뉴얼의 **canonical index**입니다.
상세 설명은 아래 chapter 파일에 분리되어 있으며, 사람용 문서는 AI 기본 read set에 포함하지 않습니다.

## 문서 권위 구조

- 사람용 시작 정본: `START_HERE.md`
- 사람용 매뉴얼 인덱스: `reference/manuals/human/HARNESS_MANUAL.md`
- 사람용 chapter index: `reference/manuals/human/index.md`
- AI 운영 정본: `.agents/ssot/*`
- 명령 분류 정본: `reference/commands/COMMAND_TAXONOMY.md`
- 호환성 명령 정책: `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`

## Chapter Map

| Chapter | 역할 |
|---|---|
| `reference/manuals/human/index.md` | 문서 권위, 매뉴얼 역할, chapter 안내 |
| `reference/manuals/human/getting-started.md` | 하네스 개념, 비전공자 시작 가이드, 설치/적용 흐름 |
| `reference/manuals/human/operations.md` | 생명주기, 운영 루프, packet, role, evidence, 배포, 프롬프트 |
| `reference/manuals/human/commands.md` | CLI 명령 레퍼런스와 command taxonomy 연결 |
| `reference/manuals/human/troubleshooting.md` | FAQ와 문제 해결 |

## AI Read Boundary

AI 기본 read set은 아래 문서로 제한합니다.

```text
.agents/runtime/ACTIVE_CONTEXT.brief.md
.agents/runtime/DOC_ROUTE.json
.agents/ssot/AI_OPERATING_CONTRACT.md
```

사람용 장문 매뉴얼과 chapter 파일은 사용자의 명시 요청 또는 수동 학습 목적일 때만 엽니다.

## Index Anchors

이 파일은 상세 설명을 반복하지 않지만, 기존 운영자가 빠르게 찾을 수 있도록 핵심 anchor를 남깁니다.

- AI/Codex/CI copied starter init: `npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none`.
- Human interactive copied starter init: `npm run harness:init`.
- Copied starter smoke: `npm install`, `npm run harness:payload-boundary`, `npm test`, `npm run harness:init`, `npm run harness:validate`, `npm run harness:status`, `npm run harness:context`, `npm run harness:validation-report`.
- Node SQLite `ExperimentalWarning`은 명령이 통과하면 known acceptable warning으로 기록하며, SQLite dependency/runtime 변경은 별도 runtime/dependency packet 없이 하지 않습니다.
- LLM Judge 결과는 advisory-only이며, invalid-context 같은 판정은 승인이나 closeout authority가 아닙니다.
- Refresh/evidence sequence: `npm run harness:sync-state`, `npm run harness:validation-report`, `npm run harness:context`, `npm run harness:status`; 요약 순서는 `validate -> validation-report -> context -> status`입니다.
- Route modes: `role-by-role`, `orchestrated-closeout`, `planner-to-developer`, `planner-to-orchestrator`.
- npm registry trouble path: `npm ping` 또는 `npm view`가 `SELF_SIGNED_CERT_IN_CHAIN`으로 실패하고 `curl.exe -I https://registry.npmjs.org/<package>`가 200/3xx이면 네트워크 전체 차단이 아니라 Node/npm TLS trust-chain 문제로 분류합니다. `npm run harness:npm-diagnostic -- --ping "<npm output>" --curl "<curl output>"`로 기록하고, 조치는 `NODE_OPTIONS=--use-system-ca` 또는 승인된 내부 CA `npm config set cafile <internal-ca.pem>`를 우선합니다. `strict-ssl=false`는 운영 우회책으로 사용하지 않습니다.
- Browser evidence fallback: Codex Browser가 막히면 Edge/Chrome CDP evidence를 사용할 수 있지만 `pass` evidence는 `http://127.0.0.1:<port>` 같은 local HTTP runtime URL이어야 합니다. `file://`로 열린 HTML은 라우팅, asset, runtime 실패를 숨길 수 있으므로 closeout pass evidence가 아닙니다.
- Security evidence scaffold: security review JSON을 손으로 맞추기 전에 packet-bound scaffold를 생성하고, root rollout처럼 이번 packet 밖의 내용은 `deferred_risks`로 분리합니다. Deferred risk는 finding이 아니며 closeout finding count를 부풀리지 않아야 합니다.
- Serial orchestration evidence: 병렬 실행을 하지 않는 packet도 `serial` batch plan을 명시할 수 있습니다. `Parallel batch plan path: not-needed`는 closeout에서 누락 경로가 아니라 의도적 부재로 처리됩니다.
- Long-Memory Boundary: root maintainer history와 long history log는 starter 기본 read set이나 새 프로젝트 history authority가 아닙니다.
- Skill discovery boundary: `reference/artifacts/SKILL_MARKETPLACE_CATALOG.md`를 먼저 보고 selected skill body만 읽습니다. 기본 context must not load all skill bodies. Skill output does not override packet authority, approval, Tester/Reviewer 판단, Planner closeout, or product acceptance.
- Deferred skill note: `conflict_resolver`는 `minimum-contract-deferred` / `OPS-SKILL-01A_CONFLICT_RESOLVER_MINIMUM_CONTRACT` 범위로만 이해합니다.
- PRF-10 BI staging terms: `draft`, `approved`, `deferred-with-reason`, `not-needed`. `approved`만 BI-heavy packet의 Ready For Code 근거가 될 수 있습니다.

Starter seed/generated runtime state: `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`; `starter_bootstrap_pending` is an expected pre-init hold, and post-init state begins after initialization.
