---
doc_id: REFERENCE_LIFECYCLE_INDEX
audience: agent-and-human
authority: reference-router
language: en
llm_read_policy: route_selected
default_context: false
---
# Reference Lifecycle Index

This index classifies the payload `reference/*` library. It is a route-selected reference, not part of the default constitutional AI load order.

Use this file when a packet, workflow, profile, or route audit needs to decide whether a reference surface is starter-essential, optional, compatibility-only, generated-contract material, or a deprecation candidate.

## Read Boundary

Nothing under `reference/` is default AI context. `route-selected starter essential` means the file is useful for kickoff or a specific workflow route, but it still stays outside the default constitutional AI load order.

Default AI entry remains governed by `AGENTS.md`, `.agents/runtime/ACTIVE_CONTEXT.brief.md`, `.agents/runtime/DOC_ROUTE.json`, and `.agents/ssot/AI_OPERATING_CONTRACT.md` according to the active route.

## Lifecycle Categories

| Category | Decision rule | Lifecycle owner | Default read policy |
|---|---|---|---|
| route-selected starter essential | Needed for kickoff, packet setup, command discovery, or route-specific starter operation. | Planner / active workflow owner | Route-selected only; outside the default constitutional AI load order. |
| optional profile package | Used only when an active profile or packet explicitly selects that profile domain. | Planner / profile owner | Route-selected by active profile or packet. |
| optional artifact template | Template or reusable guide created/read only when the active packet or workflow asks for it. | Owning workflow role | Route-selected by task need. |
| compatibility reference | Retained to explain compatibility namespaces, migration behavior, or legacy command surfaces. It is not current product identity by itself. | Maintainer / Planner | Route-selected for migration, compatibility, or command audit. |
| generated schema/reference contract | Schema, runtime contract, evidence contract, or generated-output explanation. It is not live generated state. | Runtime maintainer / Reviewer | Route-selected for validation, evidence, or runtime boundary work. |
| deprecation candidate | Candidate-only marker. Deletion, hiding, renaming, behavior change, or compatibility weakening requires a future approved deprecation/removal packet. | Planner / Maintainer | Route-selected only when cleanup or deprecation is in scope. |

## Top-Level Reference Classification

| Surface | Primary lifecycle category | Lifecycle owner | Default read policy | Rationale |
|---|---|---|---|---|
| `reference/README.md` | route-selected starter essential | Planner | Route-selected only | Human/agent router for the reference layer. |
| `reference/artifacts/` | optional artifact template | Owning workflow role | Route-selected by active packet/workflow | Mixed reusable templates, governance references, and first-use artifacts. |
| `reference/commands/` | route-selected starter essential | Runtime maintainer | Route-selected for command discovery/audit | Command classification and compatibility policy. See `reference/commands/COMMAND_TAXONOMY.md` and `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`. |
| `reference/evidence/` | generated schema/reference contract | Tester / Reviewer | Route-selected for evidence work | Evidence schemas and digest guidance. |
| `reference/manuals/` | optional artifact template | Documenter / owning workflow role | Route-selected by human/operator need | Manuals and cards are not default AI context. Human-only manual files remain Korean. |
| `reference/packets/` | route-selected starter essential | Planner | Route-selected for packet work | Packet templates and packet guidance define task boundaries when a packet is in scope. |
| `reference/planning/` | route-selected starter essential | Planner | Route-selected for kickoff/planning | Kickoff interview, requirements freeze, and planning material. |
| `reference/profiles/` | optional profile package | Planner / profile owner | Route-selected by active profile | Optional profile packages such as PRF-10. |
| `reference/reports/` | optional artifact template | Reviewer / Documenter | Route-selected when report evidence is needed | Optional report guidance and first-use report areas. |
| `reference/reviewer-profiles/` | optional artifact template | Reviewer | Route-selected for review planning | Reviewer profile guidance is selected by risk/profile/files. |
| `reference/runtime/` | generated schema/reference contract | Runtime maintainer | Route-selected for runtime boundary work | Runtime explanation and starter seed/generated state semantics. See `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`. |
| `reference/schemas/` | generated schema/reference contract | Runtime maintainer / Reviewer | Route-selected for schema validation | Machine-readable schemas and contracts. |
| `reference/skills-src/` | optional artifact template | Maintainer / Documenter | Route-selected for skill generation | `reference/skills-src/*` is a generation source for selected active skills, not a runtime skill surface. |
| `reference/legacy/current-root-v2-docs/` | compatibility reference | Maintainer / Planner | Route-selected for V2.1 migration, comparison, or starter-payload continuity work | Archived requirements, architecture, policies, release evidence, and productization packet docs from the previous root harness. It is not default context and not clean starter payload. |
| `reference/legacy/v1/` | compatibility reference | Maintainer / Planner | Route-selected for v1.0 behavior comparison, skill-friction analysis, or starter-payload continuity work | Current v1.0 harness archive. It may inform v2-native design but must not be copied into `starter/standard-harness/` or promoted as runtime code without an explicit promotion plan. |
| `reference/legacy/v2-ideas/` | compatibility reference | Maintainer / Planner | Route-selected for V2.x hardening idea review | Archived hardening idea notes split out from the previous root docs for easier lookup. They are reference material, not current product identity or active packet scope. |

## Compatibility Notes

- Compatibility command namespaces are retained and governed by `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`.
- Current command classification is governed by `reference/commands/COMMAND_TAXONOMY.md`.
- Starter seed versus generated runtime output is governed by `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`.
- Compatibility references explain old names or migration behavior; they do not override current product identity, approval boundaries, or active workflow authority.

## Deprecation Boundary

Deprecation candidates are listed in `reference/DEPRECATION_CANDIDATES.md`. That file is candidate-only guidance. It does not delete, hide, rename, behavior-change, or compatibility-weaken any reference surface.
