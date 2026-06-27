# Security Review

Use this skill when work touches security-sensitive, prompt/control, secret, dependency, deployment, generated-state, or destructive-command surfaces.

## Use When
- A change affects authentication, authorization, secrets, dependency intake, deployment, release, shell commands, generated state, prompt/control text, or external data.
- A packet risk mode is guarded or regulated.
- A reviewer asks for security or authority-boundary evidence.

## Do Not Use When
- The request is ordinary read-only status with no security-sensitive surface.
- The review would approve deployment, release, secret access, destructive commands, or approval-state mutation.
- The output would expose secrets, credentials, tokens, or private data.

## Review Checklist
- Approval boundary: no implicit approval, packet expansion, or owner bypass.
- Secret handling: redact secrets and avoid printing, persisting, or broadening access.
- Destructive command handling: require narrow approval and guard review before execution.
- Deployment and publish handling: require explicit release/deploy packet authority.
- Generated state: do not manually edit generated summaries or treat them as authority.
- Prompt/control surface: avoid unconditional skill loading, hidden authority claims, or unsafe tool instructions.
- Dependency and supply chain: require explicit intake, rationale, and verification.

## Evidence To Produce
- Security-sensitive surfaces reviewed.
- Pass/block decision.
- Findings with mitigation or owner route.
- Residual risk.

## Authority Boundary
This skill reviews risk and recommends mitigations. It must not grant access, approve secrets exposure, deploy, publish, run destructive commands, or override the active packet and role authority.
