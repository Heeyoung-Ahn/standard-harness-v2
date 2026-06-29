# Start Here

Use this starter by copying `starter/standard-harness/` into a new repository root.

From the copied repository root, initialize the harness:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . init
```

Then validate the copied starter runtime contract:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime
```

Use clean export validation only for a starter export candidate before distribution:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --clean-export
```

If you need to discard copied-project operating history later, reset only `_ops/`:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . ops-reset
```

`ops-reset` recreates `_ops/**` and required `product/docs/**` folders. It must not
delete `_harness/**` or product deliverables under `product/**`.

Ask evidence-backed operating-status questions with `operating-qa`:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "What happened, what evidence supports it, and what should happen next?"
```

`operating-qa` returns a read-model answer from indexed operating sources. It cannot
approve Ready For Code, implementation, closeout, release, residual risk, or human gates.

Create the first low-risk packet before implementation starts. The packet should define
objective, scope, out-of-scope work, change zones, acceptance criteria, evidence
requirements, and closeout criteria.

Use these zones consistently:

```text
_harness/      harness system policy/schema/catalog area
_ops/          AI/validator operating ledger area
product/src/   product source code
product/tests/ product tests
product/docs/  human-facing project, packet, and PMO documents
```

Evidence, claims, gate results, and closeout decisions are operational records. Human
documents under `product/docs/` may summarize them, but do not override `_harness`
policies, trusted evidence, gate results, or human decision records.

Use Markdown for human-facing prose documents. Use TSV as the default
spreadsheet-compatible PMO/WBS sample format; use CSV only when a project integration
explicitly needs it.
