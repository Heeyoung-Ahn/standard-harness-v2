# Harness Learnings

This directory is the repo-local non-authoritative learning surface for standard-harness.

- `learnings.jsonl` is append-only and created by `npm run harness:learn -- add ...`.
- Learning entries are references, not SSOT. If learning conflicts with packet, profile, or governance truth, the SSOT wins.
- Use `npm run harness:learn -- search --query <term>` and `npm run harness:learn -- prune` for reuse and stale checks.
