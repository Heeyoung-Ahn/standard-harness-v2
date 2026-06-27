# Repository Layout Ownership

## Purpose
This artifact defines which paths are owned by the standalone harness and which paths are free for product application code. It prevents copied starters from reserving common product paths such as `src/`, `app/`, `backend/`, `frontend/`, `server/`, or product test directories.

## Machine-Readable Map
`reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.json` is the canonical machine-readable map for change-zone routing.
It uses JSON so runtime/preflight can deterministically parse:
- `pathPattern`
- `ownerLayer`
- `defaultChangeZone`
- `routeImplication`
- `exceptionRationale`
- `productionEligibility`

Pattern precedence is deterministic: the most-specific path pattern wins, and ties use earlier rule order. Unclassified paths default to Planner-reviewed `packet-path` routing rather than `padded`.

## Ownership Table
| Path | Owner | Rule |
|---|---|---|
| `AGENTS.md` | harness governance | Entry point; keep synchronized into `standard-template/`. |
| `.agents/rules/*` | harness governance | Workspace rules and load-order constitution. |
| `.agents/artifacts/*.md` | governance Markdown truth | Human-reviewed operational truth; reconcile DB state before gate close. |
| `.agents/runtime/generated-state-docs/*` | generated projection | Derived output; never hand-edit as truth. |
| `.agents/runtime/reports/*` | generated report output | Runtime-produced reports; cite as evidence but regenerate from commands. |
| `.harness/runtime/*` | harness runtime | Node.js 24+ harness implementation only; not product application code. |
| `.harness/test/*` | harness tests | Harness test suite only; product tests may use project-selected paths. |
| `.harness/operating_state.sqlite` | hot operational DB state | Repo-local harness state; do not copy as live state between projects. |
| `reference/artifacts/*` | reusable reference artifacts | Optional reference material and standard gate templates. |
| `reference/profiles/*` | optional profile packages | Explicit opt-in project-type rules. |
| `reference/packets/*` | packet templates and concrete packets | Code-start and closeout contracts. |
| `src/`, `app/`, `backend/`, `frontend/`, `server/` | product project | Free for downstream application code after kickoff. |
| product-specific test paths | product project | Free for downstream test suites. |
| root `package.json` | harness command wrapper unless project redefines it intentionally | Provides harness commands; product runtime requirements must be documented separately if the project also uses Node. |

## Package Ownership Policy
If the product also needs root `package.json`, the project packet must record the ownership decision before `Ready For Code`.

Minimum rules:
1. Preserve all `harness:*` and harness `test` command behavior or provide an explicitly equivalent wrapper.
2. Product scripts may be added under product-owned script names.
3. Product Node version and dependency policy must be documented separately from the Node.js 24+ harness runtime requirement.
4. Harness dependencies and product dependencies must not be silently mixed; if they share one package file, document the shared ownership and risk.
5. If ownership cannot be made clear, keep the product Node app under a product source root and leave root `package.json` as the harness wrapper.

## Hot-State DB Packaging Policy
- `.harness/operating_state.sqlite` is generated hot operational state.
- Do not package or copy it as reusable starter state.
- `npm run harness:init` creates or resets the repo-local DB for the new project.
- If a starter archive contains this file, remove it before distribution or explicitly regenerate it during initialization.

## Truth Hierarchy
1. Governance Markdown truth: `.agents/artifacts/*.md`
2. Hot operational DB state: `.harness/operating_state.sqlite`
3. Generated operational docs: `.agents/runtime/generated-state-docs/*`
4. Active context and generated read surfaces

## Conflict Rule
- Governance Markdown wins over generated docs.
- DB hot-state must be reconciled to governance truth before gate close.
- Generated docs are never edited manually.
- Active context and generated docs are never write authority.

## Product Source Root Declaration
Every project that implements application code must declare its product source root before `Ready For Code`.

Minimum packet evidence:
- Product source root:
- Product test root:
- Product runtime requirements:
- Harness/product boundary exceptions:

## Sync Contract
| Class | Root path | Starter path | Sync rule |
|---|---|---|---|
| reusable governance doc | `.agents/artifacts/*.md` | `standard-template/.agents/artifacts/*.md` | sync only when reusable starter truth |
| workspace/agent rule | `AGENTS.md`, `.agents/rules/*` | `standard-template/AGENTS.md`, `standard-template/.agents/rules/*` | sync |
| harness runtime | `.harness/runtime/*` | `standard-template/.harness/runtime/*` | sync |
| harness test | `.harness/test/*` | `standard-template/.harness/test/*` | sync |
| reference artifact/template/profile | `reference/*` | `standard-template/reference/*` | sync when reusable |
| project local DB/state | `.harness/operating_state.sqlite` | none or starter placeholder only | do not sync as live state |
| generated docs/reports | `.agents/runtime/*` | generated or placeholder | do not hand-edit as truth |
| starter-only manual/onboarding | optional | `standard-template/*` | starter-owned |

## Workflow State Vocabulary
Allowed baseline workflow states:
- `starter_pending`
- `kickoff_interview`
- `requirements_draft`
- `requirements_frozen`
- `architecture_sync`
- `implementation_plan_sync`
- `packet_draft`
- `ready_for_code`
- `in_execution`
- `review`
- `packet_exit_gate`
- `release_candidate`
- `deployed`
- `closed`
- `blocked`
