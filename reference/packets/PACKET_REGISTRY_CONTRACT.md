# Packet Registry Contract

## Canonical sources

| Object | Canonical source | Generated/read model |
|---|---|---|
| Work item state | `.harness/operating_state.sqlite` / `work_item_registry` | `.agents/runtime/generated-state-docs/TASK_LIST.md` |
| Packet file | `reference/packets/*.md` or explicitly registered `verification/packets/*.md` | Active Context source trace |
| Packet artifact registration | `.harness/operating_state.sqlite` / `artifact_index` | validation report |
| Active context | generated from SQLite plus validation | `.agents/runtime/ACTIVE_CONTEXT.json`, `.agents/runtime/ACTIVE_CONTEXT.md` |

## Lifecycle

```text
registered work item
  -> canonical packet path in sourceRef/artifact_index
  -> planning-open preflight
  -> Ready For Code approval
  -> implementation-transition preflight
  -> transition command mutates SQLite
  -> generated docs and ACTIVE_CONTEXT refresh
  -> closeout preflight with packet-bound evidence manifests
  -> closeout transition
```

## Non-negotiable rules

1. Do not treat helper commands or `harness:codex-ready` as approval gates.
2. State-changing movement must use `harness:transition --apply` or a helper that delegates to it.
3. Evidence reused from another packet must fail binding unless its `packet_path` and `work_item_id` match the active packet.
4. Generated docs and Active Context are read models; repair them with `harness:sync-state` or `harness:context --repair` rather than manual edits.
