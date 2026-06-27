---
doc_id: HUMAN_FIRST_RUN_REHEARSAL
audience: human
authority: explanatory
language: ko
llm_read_policy: never_auto_read
default_context: false
---
# 5-Minute First-Run Rehearsal

이 문서는 처음 하네스를 쓰는 사람이 선택지를 고르느라 멈추지 않도록 만든 Primary path이다. 자세한 설명은 `getting-started.md`, `operations.md`, `commands.md`로 넘기고, 여기서는 첫 실행에서 필요한 안전한 순서만 다룬다.

Harness validation is not product verification. `npm run harness:validate`는 하네스 구조와 상태를 점검하지만 실제 제품 기능이 맞게 동작했는지는 증명하지 않는다. 제품 기능 검증은 packet의 product command, walkthrough, browser evidence, reviewer evidence로 별도 확인한다.

## Primary path

1. Node/npm 상태를 확인한다.
2. 새 프로젝트라면 non-interactive init을 실행한다.
3. `sync-state`로 validation-report/context/status를 정렬한 뒤 하네스 구조 검증, status, context를 확인한다.
4. 첫 packet을 열기 전 preflight로 readiness를 확인한다.
5. UI 작업이면 browser evidence 상태를 따로 만든다.
6. 유지보수자 packaging/migration/version 관심사는 `harness:packaging-readiness`로 분리해서 본다.
7. closeout 전 product verification evidence와 harness validation evidence를 따로 확인한다.

## Command block classification

아래 command block은 모두 `classification` 주석을 가진다.

```bash
# classification: executable
node --version
npm --version
```

```bash
# classification: manual-only
npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none
```

`harness:init -- --non-interactive`는 AI/Codex/CI에서 prompt 대기를 피하는 primary init 형태다. `<user goal>`, `<operator goal>`, `<approval goal>` 값은 프로젝트에 맞게 채운 뒤 실행한다.

```bash
# classification: executable
npm run harness:sync-state
npm run harness:validate
npm run harness:status
npm run harness:context
```

```bash
# classification: preflight
npm run harness:packet-preflight -- --stage implementation-transition --packet <packet-path> --work-item <work-item-id>
```

```bash
# classification: preflight
npm run browser:evidence:prompt -- --apply --packet <packet-path> --work-item <work-item-id> --base-url <app-url>
npm run browser:evidence:audit -- --packet <packet-path> --work-item <work-item-id> --strict
```

```bash
# classification: preflight
npm run harness:packaging-readiness -- --readiness-file reference/evidence/fixtures/packaging-readiness.json
```

```bash
# classification: manual-only
npm run harness:init -- --project-name "<project name>" --owner "<owner>" --requirements "<requirements path>"
```

`manual-only` block은 값을 사람이 프로젝트에 맞게 채운 뒤 실행한다. placeholder를 그대로 실행하지 않는다. 대화형 init이 필요한 사람은 마지막 예시를 쓰고, 자동화나 Codex 실행은 위 non-interactive 예시를 우선한다.

## State To Action

| State | Exact next action |
|---|---|
| `starter_bootstrap_pending` | 새 프로젝트라면 non-interactive `npm run harness:init -- --non-interactive ...` 값을 채워 실행하고, 아니라면 starter seed와 generated runtime state 경계를 먼저 확인한다. |
| `pass` | 다음 하네스 체크로 이동하되, 제품 기능 검증은 별도 evidence로 확인한다. |
| `warn` | 경고를 packet 또는 handoff에 기록하고, 필요한 보완 테스트 또는 문서 업데이트를 실행한다. |
| `hold` | 출력의 missing field, evidence path, 또는 nextAction을 보완한 뒤 같은 명령을 다시 실행한다. |
| `block` | 구현이나 closeout을 중단하고 Planner 또는 사용자에게 승인, 범위, 보안 결정을 요청한다. |
| `blocked_environment` | 환경 실패 로그를 evidence로 남기고 재시도하거나 대체 증거 정책을 승인받는다. |
| `not_run_agent_error` | agent/browser 경로를 다시 실행하고 결과를 새 evidence manifest로 저장한다. |
| `Ready For Code hold` | packet의 Ready For Code, risk overlay, challenge review, required evidence를 채운 뒤 `harness:packet-preflight`를 다시 실행한다. |
| `browser evidence hold` | screenshot 또는 정책상 허용된 bounded fallback을 evidence manifest에 묶는다. |
| `packaging readiness hold` | `migrationNotes`, `versionNotes`, `rollbackNotes` finding의 nextAction에 따라 별도 문서/마이그레이션 packet을 연다. |
| `closeout hold` | product verification, security review, browser evidence, trace matrix, reviewer evidence 중 빠진 항목을 보완한다. |

## Closeout caveat

Closeout에서 `harness:validate` pass만으로 완료를 말하지 않는다. 최소한 packet acceptance, product verification evidence, required browser evidence, security/reviewer evidence, trace or digest evidence를 각각 확인한다.

## Advanced links

- 전체 개념: `getting-started.md`
- 운영 절차: `operations.md`
- 명령 사전: `commands.md`
- 문제 해결: `troubleshooting.md`
- compact operator flow: `../operator/OPERATOR_QUICKSTART.md`
