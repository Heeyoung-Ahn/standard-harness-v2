# Standard Harness v2

Standard Harness v2 is a repository-embedded quality kernel for LLM-assisted product development. The MVP supports a local, CLI-driven, low-risk workflow where packet completion is gated by registered requirements, acceptance criteria, evidence, claims, gate results, and closeout records.

The MVP proves this chain:

```text
initialize state
-> create low-risk packet
-> approve packet when required
-> register requirements and acceptance criteria
-> register evidence
-> record supported claims
-> declare and activate gate
-> record gate result
-> close or block packet
-> regenerate current context
-> validate state
```

## Requirements

- Python 3.12 or 3.13
- Git
- GitHub CLI for release and issue operations

No external Python packages are required for the MVP.

## Test

```powershell
python -m unittest discover -s tests
```

## CLI

From a copied starter root, initialize an isolated harness:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . init
```

Create and approve a low-risk packet:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . packet-create --packet-id pkt-001 --title "Demo packet" --objective "Exercise the MVP workflow." --risk-class low --scope-summary "Demo product changes." --out-of-scope-summary "No external services." --change-zones product/src/ --acceptance-criteria-ids ac-001 --evidence-requirements unittest-output --closeout-criteria supported-claim,passing-gate --owner human-owner --idempotency-key packet-create-pkt-001
python _harness\bin\harness_cli.py --json --harness-root . packet-approve --packet-id pkt-001 --approver-id owner-1 --approver-role "Human Owner" --authority-basis "explicit approval" --approved-scope "low-risk demo packet" --rationale "MVP demo" --idempotency-key approve-pkt-001
```

Register requirement and acceptance criterion:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . requirement-register --requirement-id REQ-001 --version 1 --source-doc product/docs/project/planning/example.md --status approved --classification Core --risk-classification low --acceptance-criteria ac-001 --completion-classification evidence-required --packet-id pkt-001 --idempotency-key requirement-REQ-001
python _harness\bin\harness_cli.py --json --harness-root . acceptance-register --acceptance-criterion-id ac-001 --requirement-id REQ-001 --packet-id pkt-001 --description "Demo packet has passing evidence." --status approved --idempotency-key acceptance-ac-001
```

Register evidence, record a claim, and pass the gate:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . evidence-register --evidence-id ev-001 --packet-id pkt-001 --command-or-tool "python -m unittest discover -s product/tests" --runner unittest --cwd-or-execution-context . --environment-fingerprint python-test --artifact-path product/tests --content "Ran tests OK" --result-status passed --rationale "Demo evidence" --idempotency-key evidence-ev-001
python _harness\bin\harness_cli.py --json --harness-root . claim-record --claim-id claim-001 --packet-id pkt-001 --requirement-id REQ-001 --acceptance-criterion-id ac-001 --evidence-ids ev-001 --support-status supported --idempotency-key claim-001
python _harness\bin\harness_cli.py --json --harness-root . gate-declare --gate-id gate-001 --packet-id pkt-001 --gate-type evidence --requirement-level hard --declared-by-source packet --idempotency-key gate-declare-001
python _harness\bin\harness_cli.py --json --harness-root . gate-activate --gate-activation-id gact-001 --gate-id gate-001 --packet-id pkt-001 --idempotency-key gate-activate-001
python _harness\bin\harness_cli.py --json --harness-root . gate-record --gate-result-id gres-001 --gate-id gate-001 --packet-id pkt-001 --checked-claim-ids claim-001 --evidence-ids ev-001 --status pass --requirement-level hard --rationale "Claim is backed by passed evidence." --idempotency-key gate-result-001
```

Close, project context, and validate:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . closeout --closeout-id close-001 --packet-id pkt-001 --authority-basis "MVP closeout" --rationale "All MVP evidence is present." --idempotency-key closeout-001
python _harness\bin\harness_cli.py --json --harness-root . context --packet-id pkt-001
python _harness\bin\harness_cli.py --json --harness-root . validate --all --packet-id pkt-001
```

## Starter Payload

The clean self-hosting starter payload lives under:

```text
starter/standard-harness
```

The development repository root is not the starter payload. `starter/standard-harness`
is the folder intended to be copied into another repository. Directory names in the
starter are contractual; file names are samples except for `README.md`, `START_HERE.md`,
`_harness/README.md`, `_harness/bin/harness_cli.py`,
`_harness/policies/project-operating-folders.yaml`, and
`_harness/schemas/operating-folder-contract.schema.json`.

Inside the copied starter, the top-level `README.md` belongs to the product being built.
Harness operating guidance belongs under `_harness/README.md`.

The copied starter keeps `_harness/` and `_ops/` as AI/validator-facing areas.
Human-facing product and project documents belong under `product/docs/`.

## Release Quality

Release-quality checks are tracked in:

```text
docs/implementation/standard-harness-post-mvp-release-quality-plan-v1.md
docs/implementation/standard-harness-post-mvp-work-packets-v1.md
```

Deferred final-product work is tracked as roadmap work. It is not part of the `v0.1.0-mvp` implementation scope.
