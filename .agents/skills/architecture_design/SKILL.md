# Architecture Design

Use this skill when Planner is drafting, rebasing, or structurally updating `.agents/artifacts/ARCHITECTURE_GUIDE.md` after Requirements Freeze. It guides architecture decisions one step at a time while keeping `ARCHITECTURE_GUIDE.md`, packet approval, and Ready For Code boundaries intact.

## Use When
- Requirements are frozen or explicitly sufficient for architecture authoring.
- A new project, major scope change, source intake, system boundary change, integration, domain/data question, or environment assumption needs architecture decisions.
- Planner needs to turn requirements into decision-ready architecture notes before implementation packet drafting.
- Architecture blockers must be identified before UI/design sync, implementation planning, packet drafting, or Ready For Code.

## Do Not Use When
- The architecture guide is only being read for ordinary reference.
- Requirements Freeze is missing or too incomplete to support architecture decisions.
- The request would approve implementation, close architecture approval, open implementation packets, change Ready For Code, or mutate derived state.
- The request would create a competing ADR, step-file authority, or long-memory architecture system outside `.agents/artifacts/ARCHITECTURE_GUIDE.md` and approved packet decisions.
- The skill would copy root maintainer architecture history into `standard-template`.
- The skill would become mandatory in unconditional entry paths.

## Required Inputs
- Frozen or sufficient requirements baseline.
- Active user/source authority and any packet constraints.
- Existing `.agents/artifacts/ARCHITECTURE_GUIDE.md` content when present.
- Relevant domain, system, topology, UX/design, and testing implications.
- Open technical questions and approval-state constraints.

## Decision Queue
Before asking detailed questions, build a concise queue of architecture decisions:
- `requirements freeze`: approved requirements baseline and unresolved blockers.
- `stack / runtime`: runtime, framework, platform, package boundary, and technical constraints.
- `component structure`: modules/components, ownership, and non-ownership.
- `data model / domain`: entities, records, ownership, schema-impact assumptions, and domain foundation needs.
- `interface / integration`: inbound/outbound contracts, APIs, files, databases, manual handoffs, and fallback behavior.
- `deployment topology`: source/target environment, execution target, transfer boundary, rollback boundary, and operational assumptions.
- `quality constraints`: security, permission, performance, observability, testing, and maintainability constraints.
- `approval state`: approved, open, deferred, or blocked decisions before downstream packet drafting.

## Step Confirmation Model
Ask one decision at a time. For each step, record:
- Assumption.
- Answer Status: answered, open, deferred, or blocked.
- Downstream Impact: implementation packet, UX/design, domain/data, integration, test scope, environment, rollback, or operations.
- Blocker Status: none, needs user answer, needs source, needs domain/system/topology evidence, or must split packet.

## Blocker Checks
Stop before downstream baselines, packet drafting, implementation planning, UI/design sync, or Ready For Code when:
- Requirements Freeze is not closed enough.
- The proposed architecture bypasses `.agents/artifacts/ARCHITECTURE_GUIDE.md`.
- Domain foundation, system context, topology, integration, or quality constraints are required but missing.
- Architecture helper notes would become a competing SSOT.
- The requested action would approve implementation or mutate approval state.

## Output
- Decision-ready architecture notes.
- Proposed `.agents/artifacts/ARCHITECTURE_GUIDE.md` update boundary.
- Open assumptions and blockers.
- Downstream packet impact summary.
- Recommended next route: continue architecture questions, request human confirmation, update architecture guide under Planner authority, or hold before implementation.

## Authority Boundary
This skill may guide architecture authoring and recommend wording. It must not approve Requirements Freeze, approve architecture closure, approve implementation, open implementation packets, mutate derived state, change Ready For Code, or override Planner/user approval.
