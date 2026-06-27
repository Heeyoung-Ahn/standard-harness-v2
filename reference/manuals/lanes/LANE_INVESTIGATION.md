---
doc_id: LANE_INVESTIGATION
audience: agent-and-human
authority: reference
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 800
---
# investigation Lane

Forensic or root-cause analysis before implementation.

## Required Read Set
- `.agents/ssot/AI_OPERATING_CONTRACT.md`
- `.agents/ssot/PACKET_LANE_RULES.md`
- `.agents/ssot/EVIDENCE_GATE_RULES.md` when evidence is required

## Evidence Policy
Use digest evidence. Open raw logs only for fail/unknown/mismatch.
