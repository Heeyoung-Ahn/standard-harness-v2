---
doc_id: REFERENCE_DEPRECATION_CANDIDATES
audience: agent-and-human
authority: reference-router
language: en
llm_read_policy: route_selected
default_context: false
---
# Reference Deprecation Candidates

This file records candidate-only cleanup targets for the payload `reference/*` library.

Candidate-only means the entry is not deprecated, removed, hidden, renamed, behavior-changed, or compatibility-weakened by this packet. Any actual removal or behavior change requires a future approved deprecation/removal packet with migration guidance, compatibility impact, and verification evidence.

## Rules

- Do not delete files based on this index.
- Do not weaken compatibility command namespaces based on this index.
- Do not reclassify candidate-only material as removed or unsupported without a future approved deprecation/removal packet.
- Do not reintroduce `reference/skills` as an active skill surface.
- Keep human-only manual content Korean unless a later approved packet changes the language policy.

## Candidate Register

| Candidate | Current status | Rationale | Required future packet before action |
|---|---|---|---|
| Legacy references to `reference/skills` | Candidate only; active skill surface is `.agents/skills/*`, and `reference/skills-src/*` is the generation source. | Prevent accidental reintroduction of a second runtime skill surface after SH-V28-REFAC-003. | Approved deprecation/removal or migration packet with migration guidance and skill-surface tests. |
| Compatibility command namespaces | Candidate only; retained compatibility references. | Some old namespace references may be removable later, but SH-V28-REFAC-006 protects compatibility policy. | Approved compatibility deprecation packet with migration guidance and command audit evidence. |
| Optional first-use history/report placeholders | Candidate only; optional reference material remains route-selected. | Some first-use surfaces may be consolidated later if they create navigation noise. | Approved docs cleanup packet with route audit and payload-boundary evidence. |

## Non-Action Statement

This packet only creates a candidate index. It does not delete, hide, rename, behavior-change, or compatibility-weaken any listed surface.
