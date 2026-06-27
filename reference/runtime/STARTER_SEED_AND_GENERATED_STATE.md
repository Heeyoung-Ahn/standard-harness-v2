# Starter Seed And Generated State

## Purpose

This reference defines the boundary between the reusable starter payload and runtime state created after a project initializes the harness.

## Terms

### starter seed

A `starter seed` is a file shipped in the clean reusable payload so a new project can bootstrap the harness. Starter seed files may contain templates, placeholders, examples, and bootstrap read guidance. They are not proof of a live project state.

### read surface

A `read surface` is a file intended to orient a human or agent. A read surface may be a starter seed before initialization or generated runtime output after initialization. Read surfaces do not override approved packets, explicit user approvals, source files, or the operating database.

### generated runtime output

`generated runtime output` is produced by harness commands after initialization. Examples include `.agents/runtime/ACTIVE_CONTEXT.*`, `.agents/runtime/generated-state-docs/*`, validation reports, status summaries, and `.harness/operating_state.sqlite`.

Do not edit generated runtime output as source authority. Repair source authority first, then regenerate the runtime output with harness commands.

### post-init project state

`post-init project state` is the live state after `npm run harness:init` or equivalent initialization has created project-local runtime files. It belongs to the initialized project, not to the clean reusable starter payload.

## ACTIVE_CONTEXT.brief.md

`.agents/runtime/ACTIVE_CONTEXT.brief.md` is a shipped seed/read surface in the clean starter payload. Before initialization, it is not live project truth and must not be treated as evidence that the current project has an active packet, validated status, or generated runtime state.

After initialization, Active Context files become generated runtime output and should be refreshed through `npm run harness:context` or `npm run harness:sync-state`.

## Expected Pre-Init Validation

Before initialization, `npm run harness:validate` can return `starter_bootstrap_pending`. This is an expected pre-init hold for a clean reusable starter. It means the payload is not yet initialized as a project.

Do not run `npm run harness:init` against the reusable release artifact during maintainer hardening unless a packet explicitly approves that mutation. Use `npm run harness:payload-boundary` for clean-payload packaging checks.

## Operational Rule

- Pre-init: treat seed files as bootstrap guidance, not live state.
- Post-init: treat generated runtime output as derived state, not source authority.
- If generated runtime output is stale or missing, regenerate it; do not hand-edit it as truth.
