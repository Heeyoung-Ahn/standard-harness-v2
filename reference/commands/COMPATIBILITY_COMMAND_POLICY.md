# Compatibility Command Policy

The visible product identity is Standard Harness v2.0 for the clean starter payload and root development harness v1.0 for this development repository. Versioned command namespaces remain compatibility wrappers unless a future packet explicitly deprecates them.

## Compatibility namespaces retained

- `harness:v23`
- `harness:v24`
- `harness:v25`
- `harness:v26`
- `harness:v27`
- `harness:v28`

## Policy

- Compatibility command names are not stale product identity by themselves.
- Compatibility wrappers remain supported until a separate approved deprecation packet says otherwise.
- A command may be documented as compatibility without changing its behavior.
- No compatibility command may be deleted, renamed, hidden, or weakened by a taxonomy-only packet.
- Any removal or behavior change requires a separate approved deprecation packet with migration guidance and verification evidence.

## Operator guidance

Use the stable lifecycle and workflow commands first. Use compatibility namespaces when a packet, manual, legacy workflow, or regression fixture explicitly asks for that namespace.

For command grouping, see `reference/commands/COMMAND_TAXONOMY.md`.
