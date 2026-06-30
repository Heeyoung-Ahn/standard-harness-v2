# PKT-20 Local Tool/Auth Availability

## Metadata
- Work item: `PKT-20_REAL_PROVIDER_WORKER_SMOKE`
- Scope: local tool/auth availability only
- Checked at: 2026-06-30
- Human approval basis: user approved local tool/auth availability checking.

## Checks
| Check | Result | Evidence |
|---|---|---|
| Codex CLI discovery | present | `Get-Command codex` found `codex.exe` under `C:\Program Files\WindowsApps\OpenAI.Codex_26.623.9142.0_x64__2p2nqsd0c76g0\app\resources\codex.exe` |
| Codex config directory | present | `C:\Users\user\.codex` exists |
| Codex version command | blocked | `codex --version` failed before version output with WindowsApps access denied |
| Claude CLI discovery | not-found | `Get-Command claude` returned no command |
| Claude config directories | not-found | `C:\Users\user\.claude`, `%APPDATA%\Claude`, and `%LOCALAPPDATA%\AnthropicClaude` were not found |

## Interpretation
Current local evidence does not prove real provider worker smoke can run. It supports an
approval-bound hold or narrowed product claim for PKT-20 unless a later environment change
makes a bounded real smoke executable.

## Safety Boundary
No token, credential, session content, cache content, raw provider transcript, network call,
or actual provider worker smoke was executed or inspected by this availability check.
