---
doc_id: HUMAN_HARNESS_MANUAL_CHAPTER_INDEX
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# Human Manual Chapter Index

이 문서는 사람 운영자를 위한 한국어 매뉴얼 chapter index입니다.

## 문서 권위 구조

| 구분 | 정본 위치 | 언어/성격 | AI 자동 참조 |
|---|---|---|---:|
| 사람용 시작 문서 | `START_HERE.md` | 한국어, 설명형 | 금지 |
| 사람용 전체 매뉴얼 | `reference/manuals/human/HARNESS_MANUAL.md` | 한국어, 상세 설명 | 금지 |
| AI 운영 정본 | `.agents/ssot/*` | 영어, 간결한 규칙 | 허용 |
| AI 현재 상태 | `.agents/runtime/ACTIVE_CONTEXT.brief.md` | 영어, generated brief | 허용 |
| AI 문서 라우팅 | `.agents/runtime/DOC_ROUTE.json` | machine-readable route | 허용 |
| Evidence 구조 | `reference/schemas/*`, `reference/evidence/*` | 영어, 간결한 schema/digest | 조건부 |

AI 기본 read set은 아래 3개입니다.

```text
.agents/runtime/ACTIVE_CONTEXT.brief.md
.agents/runtime/DOC_ROUTE.json
.agents/ssot/AI_OPERATING_CONTRACT.md
```

사람용 장문 매뉴얼, 개발 기초 설명, raw log, 전체 profile 원문은 AI가 자동으로 읽지 않습니다.
막힌 경우에도 `DOC_ROUTE.json`, selected SSOT, evidence digest를 먼저 보고, 사람용 매뉴얼은 사용자의 명시 요청이나 수동 학습 목적으로만 엽니다.

## 이 매뉴얼의 역할

이 문서는 설치된 표준 하네스를 운영하는 사람이 하네스 개념, 프로젝트 진행 방식, packet, role, evidence, lane, closeout, release 흐름을 이해하기 위한 설명서입니다.
실제 실행 권위는 아래 순서를 따릅니다.

1. Runtime code and validators: `.harness/runtime/*`
2. AI SSOT: `.agents/ssot/*`
3. Machine-readable schemas: `reference/schemas/*`
4. Current generated runtime context: `.agents/runtime/ACTIVE_CONTEXT.*`, `.agents/runtime/DOC_ROUTE.json`
5. Governance artifacts: `.agents/artifacts/*`
6. Human manuals: `START_HERE.md`, `reference/manuals/human/*`

이 매뉴얼은 설명용 guidebook입니다. SSOT, workflow authority, validator, 승인 권한을 대체하지 않습니다.

- AI entry adapter: `AGENTS.md`
- AI operating SSOT: `.agents/ssot/AI_OPERATING_CONTRACT.md`
- Role authority SSOT: `.agents/ssot/ROLE_AUTHORITY_MATRIX.md`
- Routing SSOT: `.agents/ssot/ROUTING_RULES.md`
- Lane rule SSOT: `.agents/ssot/PACKET_LANE_RULES.md`
- Evidence gate SSOT: `.agents/ssot/EVIDENCE_GATE_RULES.md`
- Human conductor SSOT: `.agents/ssot/HUMAN_CONDUCTOR_RULES.md`
- Abstention SSOT: `.agents/ssot/ABSTENTION_RULES.md`
- Supply-chain SSOT: `.agents/ssot/SUPPLY_CHAIN_RULES.md`
- Context economy SSOT: `.agents/ssot/CONTEXT_ECONOMY_RULES.md`
- Untrusted content SSOT: `.agents/ssot/UNTRUSTED_CONTENT_RULES.md`
- Guard mode SSOT: `.agents/ssot/GUARD_MODE_RULES.md`
- 상태/승인 정본: `.agents/artifacts/*`
- 작업 단위 합의: `reference/packets/*`
- 실행 workflow 계약: `.agents/workflows/*`
- 파생 재진입 surface: `.agents/runtime/ACTIVE_CONTEXT.*`


## Chapter Map

1. `reference/manuals/human/getting-started.md` - 하네스 개념, 비전공자 시작, 설치와 기존 프로젝트 적용
2. `reference/manuals/human/operations.md` - 전체 생명주기, 운영 루프, packet, role, evidence, 배포, 프롬프트
3. `reference/manuals/human/commands.md` - CLI 명령 레퍼런스, command taxonomy, compatibility policy
4. `reference/manuals/human/troubleshooting.md` - FAQ와 문제 해결

전체 매뉴얼의 canonical index는 `reference/manuals/human/HARNESS_MANUAL.md`입니다.
