# Advisory AI Review

## Purpose

Use the advisory AI review runner when an operator wants provider-neutral AI/Judge findings as bounded review evidence. The runner validates mock or provider output, records disagreement disposition, keeps prompt-injection-like text as data, and preserves redaction boundaries.

## Command

```sh
npm run harness:ai-review-runner -- --apply --review-file reference/evidence/fixtures/advisory-ai-review.json
```

The `--review-file` path avoids shell JSON quoting differences across Windows, npm, and POSIX shells.

## Authority Boundary

The runner is advisory only. It cannot approve implementation, close packets, release, close risks, accept residual risk, override guard decisions, override reviewer authority, or prove product behavior.

## Output

With `--apply`, the command writes:

- `.agents/runtime/advisory-ai-review.json`
- `.agents/runtime/ADVISORY_AI_REVIEW.md`

The report includes:

- input and output schema versions,
- decision,
- redaction summary,
- prompt-injection disposition,
- disagreement disposition,
- guard overlays,
- schema validation findings,
- advisory findings with redacted evidence quotes.

## Failure Modes

- Missing input package fields produce `block`.
- Missing or malformed `findings` output produces `block`.
- Unsupported finding `disposition` values produce `invalid_disposition`.
- Prompt-injection-like text remains `evidence_only`.
- Secret-looking evidence quotes are redacted before output.
