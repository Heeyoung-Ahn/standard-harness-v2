# Directional Regression Pilot

Use this pilot after a hardening wave or guarded harness change needs evidence that the direction principles still hold. The pilot is repeatable evidence only; it does not approve implementation, close packets, release, close risk, or accept residual risk.

## Command

```bash
npm run harness:directional-pilot -- --apply
```

For a completed report, provide an evidence file:

```bash
npm run harness:directional-pilot -- --apply --evidence-file reference/evidence/fixtures/directional-pilot-completed-evidence.json
```

The command writes:

- `.agents/runtime/directional-regression-pilot.json`
- `.agents/runtime/DIRECTIONAL_REGRESSION_PILOT.md`

## Evidence Lanes

Keep these lanes separate:

| Lane | Purpose | Example command |
|---|---|---|
| Clean-payload checks | Verify reusable starter payload shape without initialized runtime state | `npm run harness:payload-boundary` |
| Initialized-project checks | Verify an initialized starter/project can run its tests and state checks | `npm test` |
| Product behavior checks | Verify the actual product feature or pilot scenario | Project-specific command or manual scenario |
| Harness validation checks | Verify harness structural/state consistency only | `npm run harness:validate` |

`harness:validate` and `harness:validation-report` are not product behavior verification.

## Required Evidence

Record evidence for:

- TDD RED/GREEN result.
- Browser evidence as `pass` only for real-browser or policy-approved conditional evidence; otherwise use `warn`, `hold`, `blocked_environment`, or `not_run_agent_error`.
- Packet-bound security review.
- Compound learning when reusable lessons appeared.
- Context budget result.
- Manual-following evidence from this guide and the relevant packet/manual.
- Closeout preflight evidence.

When using `--evidence-file`, each completed evidence record should include:

- `status`
- `command`
- `exitCode`
- `cwd`
- `timestamp`
- `sourceLane`
- `provenance`
- `artifactPath` for pass evidence
- `artifactSha256` when a hash is available

Manual notes may support the report, but a manually edited JSON file is not enough to turn a lane into `pass` when artifact proof, exit code, or provenance is missing. Missing or unverifiable pass evidence must remain `warn`, `hold`, or `block`.

## Direction Principle Map

The generated report maps evidence to:

- Friction loop
- Long memory
- Compound engineering
- TDD realism
- Confidence control
- Anti-rubber-stamp
- Product verification
- Security and requirement review
- Real browser evidence
- Skill invocation
- Manual fidelity
- Anti-spaghetti
- Refactor awareness
- AI-assisted review
- Token discipline
- Maintenance docs

Every direction principle must have at least one evidence key. A missing or blocked item should remain visible; do not convert it into a false pass.
