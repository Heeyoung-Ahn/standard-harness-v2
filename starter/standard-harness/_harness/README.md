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

Human-authored requirements are treated as project-direction authority, not a loose
feature list. Before Ready For Code, an independent packet-document reviewer must check
that the packet preserves the Human Owner and Planner intent, Requirements direction,
Implementation Plan, architecture SSOT, acceptance strength, and verification scope.

After implementation, closeout requires four separate independent review lenses:
`challenge_review`, `adversarial_security_review`, `code_quality_review`, and
`evidence_review`. These reviews verify that the implemented work satisfies the approved
packet and source requirements, not only that tests happen to pass.

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
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --clean-export
```

`init` creates the harness state database and recreates missing `_ops/**` and
`product/**` folders from `_harness/policies/project-operating-folders.yaml`. It does
not overwrite existing product documents or operational records.

`ops-reset` removes copied-project operating records under `_ops/` and recreates the
required `_ops/**` and `product/docs/**` folder surface. It preserves `_harness/**` and
existing product deliverables under `product/**`.

`validate --starter --installed-runtime` checks a copied starter after local use and
tolerates only approved runtime-generated state such as caches and `.harness` state.
It is not clean export proof. `validate --starter --clean-export` is the strict export
candidate check and rejects runtime state, caches, logs, generated reports, provider
entry contracts, secrets, release evidence, and real operating history.

Provider worker smoke uses a provider-neutral descriptor. `reviewer_provider` remains a
legacy fallback; new packet instructions should use `providerTopology` so project-level
Conductor selection and packet-level role assignments are explicit:

```json
{
  "providerTopology": {
    "projectTopology": {
      "conductor": {"provider": "codex", "adapterId": "codex-cli-local"}
    },
    "packetTopology": {
      "roles": {
        "project_manager": {"provider": "codex", "adapterId": "codex-cli-local"},
        "planner": {"provider": "claude_code", "adapterId": "claude-code-local"},
        "developer": {"provider": "codex", "adapterId": "codex-cli-local"},
        "documenter": {"provider": "codex", "adapterId": "codex-cli-local"},
        "tester": {"provider": "codex", "adapterId": "codex-cli-local"},
        "reviewer": [
          {
            "provider": "claude_code",
            "adapterId": "claude-code-local",
            "reviewerId": "reviewer_a",
            "reviewLens": "code_quality_review"
          },
          {
            "provider": "codex",
            "adapterId": "codex-cli-local",
            "reviewerId": "reviewer_b",
            "reviewLens": "evidence_review"
          }
        ]
      },
      "workerAliases": {
        "worker1": {"role": "developer"},
        "worker2": {"role": "reviewer", "reviewerId": "reviewer_b"}
      }
    }
  }
}
```

Persist and report the packet topology through the starter CLI when a copied project
needs durable operating-state evidence:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . provider-topology record --packet-id PKT-0001 --topology-json "{...}" --idempotency-key PKT-0001:provider-topology
python _harness\bin\harness_cli.py --json --harness-root . provider-topology report --packet-id PKT-0001
```

Topology validation fails closed for unsupported providers, blank providers, unknown
role keys, ambiguous non-reviewer role assignments, missing or duplicate reviewer ids,
missing review lenses, invalid worker aliases, mixed `reviewer_provider` plus
`providerTopology`, and adapter ids that do not match the selected provider. Emitted
topology evidence normalizes adapter ids from the provider policy instead of trusting
descriptor text.

Topology assignments also fail closed on unknown nested fields before persistence.
Normalized topology records retain only provider topology contract fields, so
authority-looking fields such as `approvalStateMutationAllowed` cannot be smuggled
through packet role assignments.

Worker aliases are limited to `worker1` and `worker2` and retain only `role` plus
`reviewerId` when applicable. Captured role assignments include `evidenceRef`, and
reviewer capture must match the declared reviewer id, review lens, provider, adapter
id, and declared evidence reference when one is supplied.

Worker alias values are canonicalized before persistence: `role` is stored as stripped
lowercase, and `reviewerId` is stored stripped. Routing uses the same canonical
interpretation as reporting.
Reviewer assignment values are also canonicalized before persistence and routing:
`reviewerId`, `reviewLens`, and `evidenceRef` are stored stripped, and captured-output
matching uses the same canonical values.

The emitted `providerTopologyEvidence` is evidence only. It records role/provider,
reviewer id, review lens, readiness state, and `approvalStateMutationAllowed=false`; it
does not approve Ready For Code, closeout, release, residual risk, productization, or
real-provider readiness.

Validate closeout ledger support chains before packet closeout:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . closeout-ledger-validate --packet-id PKT-0001
python _harness\bin\harness_cli.py --json --harness-root . closeout-ledger-validate --ledger-path _ops\evidence\PKT-0001\closeout-ledger.json
```

Use `--packet-id` for trusted closeout validation. It builds the ledger from runtime
records owned by the harness store. `--ledger-json` and `--ledger-path` are diagnostic
fixture modes only; they are marked untrusted by the CLI even if the input JSON contains
trusted-looking provenance or delegation fields. Caller-supplied dictionaries and
supplemental fixture data cannot create trusted runtime provenance; trusted scoped
delegation must come from a service-owned Conductor delegation grant record created by
the trusted `conductor-grant-create` command/service path. Conductor grant events are
audit/read-model traces only; closeout authority is not derived from caller-controlled
event payload fields.

The closeout ledger validator requires the full support chain:
evidence -> claim -> gate -> pre-RFC `packet_doc_review` -> independent review lenses
-> Reviewer adjudication -> Planner closeout. It fails closed when any link is missing,
when supported claims reference missing evidence, when passing gates reference missing
claims, when the ledger did not come from the trusted `--packet-id` runtime ledger path,
when retrospective packet-doc review is used as pre-RFC evidence, when wrapper output
claims approval but persisted closeout is blocked, when provider readiness is unavailable
or narrowed but reported as proven, or when PM rows, projections, release bundles, QA
answers, generated state, clean-export evidence, or inherited root memory try to approve
gates. Delivery-loop thresholds require a User decision unless a selected Conductor has
a valid scoped Human delegation record read from the trusted service-owned grant store
for loop-threshold judgment. Each required independent review lens must also carry
packet-bound evidence linkage.

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
