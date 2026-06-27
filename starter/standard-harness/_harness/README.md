# Standard Harness Starter Payload

This directory contains the harness system for a clean starter payload. It is intended
for AI agents and validators first, not as the primary human project documentation
surface. Human-facing project documents belong under `product/docs/`.

## Operating Philosophy

Standard Harness treats the harness as the project operating system. The harness system
must remain stable and uncontaminated while project work produces operating records in
`_ops/` and product artifacts in `product/`.

The harness should make long-running LLM-assisted work traceable by preserving packet
intent, evidence, decisions, wiki proposals, active context, and validation results. A
packet should leave enough record for a later agent or human reviewer to understand what
was built, which tests and reviews were run, and which claims are supported by evidence.

## Folder Contract

Directory names are contractual. File names are samples except for the minimum files
required by the starter validation contract.

```text
_harness/
  README.md
  bin/
  system/
  policies/
  schemas/
  catalog/
  contracts/
  examples/
_ops/
  packets/
  evidence/
  decisions/
  wiki-proposals/
  wiki/
  backlog/
  metrics/
  active-context/
product/
  src/
  tests/
  docs/
```

`_harness/` stores the harness runtime, policies, schemas, catalogs, and requirement
trace contracts. Product packets must not casually modify this area.

`_ops/` stores operating records generated while using the harness. It is seed-only in
the starter payload and can later be reset without deleting the harness system or product
artifacts.

`product/` stores the project being built: source under `product/src`, tests under
`product/tests`, and human-facing documents under `product/docs`.
The top-level `README.md` belongs to this product.

## Commands

Run commands from the copied starter repository root.
The starter CLI file is `_harness/bin/harness_cli.py`.

```powershell
python _harness\bin\harness_cli.py --json --harness-root . init
python _harness\bin\harness_cli.py --json --harness-root . ops-reset
python _harness\bin\harness_cli.py --json --harness-root . validate --starter
```

`init` creates the harness state database and recreates missing `_ops/**` and
`product/**` folders from `_harness/policies/project-operating-folders.yaml`. It does
not overwrite existing product documents or operational records.

`ops-reset` removes copied-project operating records under `_ops/` and recreates the
required `_ops/**` and `product/docs/**` folder surface. It preserves `_harness/**` and
existing product deliverables under `product/**`.

Create the first low-risk packet before implementation starts:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . packet-create --packet-id PKT-0001 --title "First packet" --objective "Start the project under Standard Harness." --risk-class low --scope-summary "Initial product setup." --out-of-scope-summary "Harness system changes." --change-zones product/docs --acceptance-criteria-ids AC-0001 --evidence-requirements "starter validation" --closeout-criteria "packet created" --owner human-owner --idempotency-key first-packet
```

## Clean Payload Rule

The starter payload must not contain local state, local evidence, real packet history,
release evidence, logs, caches, secrets, external review attachments, generated
validation reports, or product-specific artifacts from the development repository.

## Reset Guidance

For a fresh project run, use `ops-reset` only when you intentionally want to discard
operating history. Do not remove `_harness/` unless you are replacing the harness system
itself.

If `product/` is missing, run `init` to recreate the documented product folder surface.
Existing files under `product/` are product artifacts and are preserved by initialization.

Human-facing prose documents use Markdown. PMO/WBS table samples use TSV by default and
may use CSV only when a project integration explicitly needs CSV.
