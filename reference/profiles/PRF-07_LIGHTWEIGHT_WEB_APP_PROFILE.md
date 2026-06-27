# PRF-07 Lightweight Web/App Profile

## Purpose
Use this optional profile for small web apps, simple internal tools, prototypes that still need a controlled handoff, or single-purpose apps where the full legacy/workflow/data migration gate would be too heavy.

This profile keeps governance light without making implementation untracked.

## Approval Rule
- Activate only when the project is intentionally small in scope and does not require legacy replacement, approval workflow, airgapped delivery, or regulated/audit-heavy controls.
- Do not use this profile to bypass data-impact, security, deployment, or approval rules that are actually relevant.
- If the app grows into a business workflow, legacy replacement, or audit-heavy product, add the matching stronger profile and rebaseline the packet.
- `PRF-07` is active only when it is declared in `.agents/artifacts/ACTIVE_PROFILES.md` and cited by the active packet.

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Runtime / framework:
- Rendering / app mode:
- Data persistence boundary:
- Auth / user identity requirement:
- Deployment target:
- External API / integration boundary:
- Lightweight acceptance:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active packets cite `reference/profiles/PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md`.
- Product-specific framework, route, component, database, API, hosting, and UI decisions stay in the project packet.
- If the packet introduces durable data, authentication, payments, workflow approval, migration, or mobile release requirements, activate the relevant stronger profile before `Ready For Code`.
