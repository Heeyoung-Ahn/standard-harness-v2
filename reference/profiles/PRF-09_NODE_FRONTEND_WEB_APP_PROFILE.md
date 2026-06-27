# PRF-09 Node/Frontend Web App Profile

## Purpose
Use this optional profile when the product application is a Node.js, frontend, SPA, SSR, static-site, or full-stack JavaScript/TypeScript web app.

This profile is stronger than `PRF-07` because it requires package ownership, build/test commands, runtime policy, environment handling, API boundaries, and deployment evidence.

## Approval Rule
- Activate when product implementation depends on Node.js package scripts, a frontend framework, a bundler, SSR/static rendering, frontend deployment, or a JavaScript/TypeScript build pipeline.
- Keep the harness Node.js 24+ runtime requirement separate from the product Node.js runtime policy.
- If the project also has workflow approval, legacy replacement, regulated data, Android release, or migration requirements, combine this profile with the stronger relevant profiles.
- `PRF-09` is active only when it is declared in `.agents/artifacts/ACTIVE_PROFILES.md` and cited by the active packet.

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Package ownership policy:
- Node.js product runtime policy:
- Package manager:
- Framework / bundler:
- Build command:
- Test command:
- Environment variable policy:
- API / backend boundary:
- Static asset / routing policy:
- Deployment target:
- Browser smoke evidence: not-needed with rationale, or recorded
- Browser smoke seed state:
- Browser smoke reset behavior:
- Browser smoke selected filters/week/date:
- Browser smoke expected row/state:
- Browser smoke screenshot/artifact path:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active packets cite `reference/profiles/PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md`.
- Product-specific routes, components, package names, deployment hostnames, env var values, API URLs, and secrets stay in project packets or secured project artifacts.
- `Ready For Code` is blocked when package ownership, product runtime, build/test command, environment, API boundary, or deployment target evidence is unknown.
