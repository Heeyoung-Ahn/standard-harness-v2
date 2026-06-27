# Standard Harness Post-MVP Release Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed MVP into a release-ready repository with CI, operator documentation, release records, issue-backed deferred work, and an external starter validation path.

**Architecture:** Keep the MVP kernel unchanged unless a release-quality test exposes a defect. `KFIX-001` is the pre-release exception: it hardens MVP completion integrity before CI, README, release notes, and starter validation work begin. Release quality work adds repository-level automation and documentation around the existing Python standard-library implementation. Deferred final-product work is converted into traceable GitHub issues rather than implemented in this release slice.

**Tech Stack:** Python 3 standard library, `unittest`, GitHub Actions, GitHub CLI, Markdown documentation, GitHub issues, and repository-local scripts only.

---

## Source Inputs

Read these files before executing the plan:

- `docs/implementation/standard-harness-implementation-plan-v1.md`
- `docs/requirements/standard-harness-mvp-cut-v1.md`
- `docs/architecture/standard-harness-repository-topology-v1.md`
- `docs/requirements/standard-harness-validation-eval-contract-v1.md`
- `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`

## Release Quality Scope

Included:

- GitHub Actions CI for the current Python test suite
- Pre-release MVP integrity hardening for packet completion, gate pass, state append, and registry reconciliation defects
- Root `README.md` with setup, CLI, test, and starter usage commands
- GitHub CLI PATH and authentication preflight documentation
- Release tag decision record
- MVP completion note and changelog
- GitHub issue creation workflow for deferred work
- External sample repository starter validation plan

Excluded:

- Automatic SSOT extraction implementation
- Semantic diff engine implementation
- Full adapter matrix implementation
- Browser, cloud, and device adapter implementation
- Dashboard implementation
- Cloud orchestration implementation
- High-integrity signing implementation
- Advanced Git reconciliation implementation

Deferred items must be represented as open issues or roadmap packets, not as rejected requirements.

## Target Files

Create:

- `.github/workflows/ci.yml`
- `README.md`
- `CHANGELOG.md`
- `docs/decisions/DR-0001-release-tag-policy.md`
- `docs/release/mvp-completion-note-v1.md`
- `docs/release/gh-cli-environment-check-v1.md`
- `docs/release/deferred-work-issue-plan-v1.md`
- `docs/release/starter-sample-validation-plan-v1.md`
- `tests/evals/test_mvp_integrity_hardening.py`
- `tests/integration/test_readme_commands.py`

Modify:

- `.gitignore`
- `src/standard_harness/state/store.py`
- `src/standard_harness/domain/packets.py`
- `src/standard_harness/domain/requirements.py`
- `src/standard_harness/domain/artifacts.py`
- `src/standard_harness/domain/evidence.py`
- `src/standard_harness/domain/gates.py`
- `src/standard_harness/domain/closeout.py`
- `src/standard_harness/validation/readiness.py`
- `src/standard_harness/validation/aggregator.py`
- `docs/implementation/standard-harness-post-mvp-work-packets-v1.md` only when packet statuses change during execution

Do not modify:

- `docs/requirements/*` requirement meaning
- `starter/standard-harness/*` except when a release-quality test proves a starter onboarding defect
- `.harness/state/harness.sqlite3`

## Verification Commands

Run these commands before claiming completion:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
OK
```

Run this after GitHub Actions is pushed:

```powershell
git status --short
git log -1 --oneline
```

Expected:

```text
git status --short
```

prints no tracked changes, and `git log -1 --oneline` shows the release-quality commit.

## Task RQ-00: Baseline Verification

**Files:**

- Read: `tests/`
- Read: `src/standard_harness/`

- [ ] **Step 1: Verify clean working tree**

Run:

```powershell
git status --short
```

Expected:

```text
```

If tracked changes exist, inspect them before editing. Do not discard user changes.

- [ ] **Step 2: Run MVP regression tests**

Run:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
Ran 38 tests
OK
```

- [ ] **Step 3: Record baseline evidence in the packet**

Update `docs/implementation/standard-harness-post-mvp-work-packets-v1.md` packet `REL-000` with the exact command output summary:

```markdown
Evidence:
- `python -m unittest discover -s tests` passed with 38 tests.
```

## Task KFIX-001: MVP Integrity Hardening

**Files:**

- Create: `tests/evals/test_mvp_integrity_hardening.py`
- Modify: `src/standard_harness/state/store.py`
- Modify: `src/standard_harness/domain/packets.py`
- Modify: `src/standard_harness/domain/requirements.py`
- Modify: `src/standard_harness/domain/artifacts.py`
- Modify: `src/standard_harness/domain/evidence.py`
- Modify: `src/standard_harness/domain/gates.py`
- Modify: `src/standard_harness/domain/closeout.py`
- Modify: `src/standard_harness/validation/readiness.py`
- Modify: `src/standard_harness/validation/aggregator.py`
- Modify: `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`

**Goal:** Block false MVP completion before release-quality work starts.

**Scope:**

- Do not add post-MVP product capabilities.
- Do not introduce external dependencies.
- Preserve existing successful low-risk packet flow.
- Tighten only invalid state transitions, invalid references, invalid gate pass records, and invalid closeout decisions.

- [ ] **Step 1: Mark KFIX-001 in progress**

Update `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`:

```markdown
### KFIX-001 MVP Integrity Hardening

Status: `in_progress`
```

- [ ] **Step 2: Add failing regression tests**

Create `tests/evals/test_mvp_integrity_hardening.py` with tests named exactly:

```text
test_closeout_blocks_when_any_acceptance_criterion_has_no_supported_claim
test_gate_pass_rejects_evidence_not_linked_to_checked_claim
test_gate_pass_requires_linked_evidence_for_each_checked_claim
test_duplicate_packet_id_with_new_idempotency_key_is_rejected_without_event
test_append_event_rejects_stale_expected_state_version
test_registry_rejects_unknown_and_cross_packet_references
test_readiness_blocks_when_packet_acceptance_ids_are_not_registered
```

Required assertions:

```text
test_closeout_blocks_when_any_acceptance_criterion_has_no_supported_claim:
- create a packet with acceptance ids ["ac-001", "ac-002"]
- register and support only ac-001
- record a passing gate for the ac-001 claim
- closeout returns decision_status="blocked"
- diagnostic_ids contains "missing_supported_claim"

test_gate_pass_rejects_evidence_not_linked_to_checked_claim:
- create claim-001 with evidence ev-001
- register unrelated passed evidence ev-002
- gate-record pass with checked_claim_ids=["claim-001"] and evidence_ids=["ev-002"]
- GateService.record_gate_result raises ValueError

test_gate_pass_requires_linked_evidence_for_each_checked_claim:
- create claim-001 with ev-001 and claim-002 with ev-002
- gate-record pass with both claims but only evidence_ids=["ev-001"]
- GateService.record_gate_result raises ValueError

test_duplicate_packet_id_with_new_idempotency_key_is_rejected_without_event:
- create packet pkt-001 with idempotency key key-a
- record latest_event_seq
- create packet pkt-001 again with idempotency key key-b
- PacketService.create_packet raises ValueError
- latest_event_seq is unchanged

test_append_event_rejects_stale_expected_state_version:
- initialize an empty store
- call append_event(expected_state_version=999)
- append_event raises ValueError
- latest_event_seq remains 0

test_registry_rejects_unknown_and_cross_packet_references:
- requirement registration rejects unknown packet ids
- acceptance registration rejects unknown requirement ids
- acceptance registration rejects requirement ids from another packet
- claim recording rejects evidence ids from another packet

test_readiness_blocks_when_packet_acceptance_ids_are_not_registered:
- create and approve a packet whose acceptance_criteria_ids contains ac-001
- do not register ac-001
- readiness returns status="blocked"
- diagnostics contains "unregistered_acceptance_criterion"
```

The test setup must use `tempfile.TemporaryDirectory()` and `HarnessStore(tmp)` so it does not touch `.harness/state/harness.sqlite3`.

- [ ] **Step 3: Run the KFIX test file and confirm RED**

Run:

```powershell
python -m unittest tests.evals.test_mvp_integrity_hardening
```

Expected:

```text
FAILED
```

At least these failures should be present before implementation:

```text
closeout incorrectly returns decision_status='closed'
gate result incorrectly accepts unlinked evidence
append_event incorrectly accepts stale expected_state_version
readiness incorrectly returns status='ready'
```

- [ ] **Step 4: Harden `HarnessStore.append_event` stale-write behavior**

In `src/standard_harness/state/store.py`, add a read helper and enforce `expected_state_version` before insert:

```python
    def event_for_idempotency_key(self, idempotency_key: str) -> dict[str, Any] | None:
        if not self.db_path.exists():
            return None
        with closing(self.connect()) as conn:
            row = conn.execute(
                "select * from events where idempotency_key = ?", (idempotency_key,)
            ).fetchone()
        if row is None:
            return None
        return _row_to_event(row)
```

Inside `append_event`, after the existing idempotency lookup and before inserting a new event:

```python
            if expected_state_version is not None:
                current_version = conn.execute(
                    "select coalesce(max(event_seq), 0) as seq from events"
                ).fetchone()["seq"]
                if int(current_version) != expected_state_version:
                    raise ValueError(
                        f"expected_state_version mismatch: expected {expected_state_version}, current {current_version}"
                    )
```

- [ ] **Step 5: Reject duplicate entity ids before appending new events**

In each create/register service, allow same idempotency key replay but reject the same entity id with a new idempotency key before `append_event()`.

```python
existing_event = self.store.event_for_idempotency_key(idempotency_key)
if existing_event is not None:
    return self.get_packet(packet_id)
if self._packet_exists(packet_id):
    raise ValueError(f"packet_id already exists: {packet_id}")
```

Apply this rule to every entity id below:

```text
PacketService.create_packet:
- replay return: self.get_packet(packet_id)
- duplicate check: packets.packet_id
- duplicate error: "packet_id already exists: <packet_id>"

RequirementRegistry.register_requirement:
- replay return: self.get_requirement(requirement_id)
- duplicate check: requirements.requirement_id
- duplicate error: "requirement_id already exists: <requirement_id>"

RequirementRegistry.register_acceptance_criterion:
- replay return: self.get_acceptance_criterion(acceptance_criterion_id)
- duplicate check: acceptance_criteria.acceptance_criterion_id
- duplicate error: "acceptance_criterion_id already exists: <acceptance_criterion_id>"

ArtifactRegistry.register_artifact:
- replay return: self.get_artifact(artifact_id)
- duplicate check: artifacts.artifact_id
- duplicate error: "artifact_id already exists: <artifact_id>"

EvidenceService.register_evidence:
- replay return: self.get_evidence(evidence_id)
- duplicate check: evidence.evidence_id
- duplicate error: "evidence_id already exists: <evidence_id>"

EvidenceService.record_claim:
- replay return: self.get_claim(claim_id)
- duplicate check: claims.claim_id
- duplicate error: "claim_id already exists: <claim_id>"

GateService.declare_gate:
- replay return: self.get_gate(gate_id)
- duplicate check: gate_declarations.gate_id
- duplicate error: "gate_id already exists: <gate_id>"

GateService.activate_gate:
- replay return: self.get_activation(gate_activation_id)
- duplicate check: gate_activations.gate_activation_id
- duplicate error: "gate_activation_id already exists: <gate_activation_id>"

GateService.record_gate_result:
- replay return: self.get_gate_result(gate_result_id)
- duplicate check: gate_results.gate_result_id
- duplicate error: "gate_result_id already exists: <gate_result_id>"

CloseoutService.close_packet:
- replay return: self.get_closeout(closeout_id)
- duplicate check: closeouts.closeout_id
- duplicate error: "closeout_id already exists: <closeout_id>"
```

- [ ] **Step 6: Add registry referential integrity checks**

Before appending events:

```text
RequirementRegistry.register_requirement:
- packet_id must exist.

RequirementRegistry.register_acceptance_criterion:
- packet_id must exist.
- requirement_id must exist.
- requirement.packet_id must equal packet_id.
- acceptance_criterion_id must be listed in packet.acceptance_criteria_ids.

ArtifactRegistry.register_artifact:
- packet_id must exist.

EvidenceService.register_evidence:
- packet_id must exist.
- if claim_id is provided, claim must exist and claim.packet_id must equal packet_id.

EvidenceService.record_claim:
- packet_id must exist.
- requirement_id must exist and belong to packet_id.
- acceptance_criterion_id must exist and belong to packet_id.
- evidence_ids must all exist and belong to packet_id.
- support_status='supported' still requires all referenced evidence to be passed.
```

Use `KeyError` only for read methods such as `get_packet()`. Use `ValueError` for invalid write requests so CLI output remains a structured `command_failed` diagnostic.

- [ ] **Step 7: Require gate pass evidence to be linked to checked claims**

Update `GateService._validate_pass_inputs()` so each checked claim has at least one of its own `evidence_ids` in the gate result `evidence_ids`.

Required behavior:

```text
checked_claim_ids = ["claim-001"]
claim-001.evidence_ids = ["ev-001"]
gate_result.evidence_ids = ["ev-002"]
-> ValueError
```

For multiple checked claims:

```text
checked_claim_ids = ["claim-001", "claim-002"]
claim-001.evidence_ids = ["ev-001"]
claim-002.evidence_ids = ["ev-002"]
gate_result.evidence_ids = ["ev-001"]
-> ValueError
```

- [ ] **Step 8: Require closeout coverage for every packet acceptance criterion**

Update `CloseoutService.close_packet()` so `decision_status` is `closed` only when all are true:

```text
- every packet.acceptance_criteria_ids entry exists in acceptance_criteria for the same packet
- every acceptance criterion has at least one supported claim
- every supported claim used for closeout has passed evidence
- at least one passing gate result exists
- passing gate results cover every claim used for closeout through checked_claim_ids
```

Add diagnostic ids for blocked cases:

```text
unregistered_acceptance_criterion
missing_supported_claim
missing_gate_pass
missing_gate_claim_coverage
missing_evidence
```

- [ ] **Step 9: Reconcile readiness and validate diagnostics with the same integrity rules**

Update `ReadinessService.check_packet()`:

```text
- keep existing required list-field diagnostics
- if packet.acceptance_criteria_ids contains ids not present in acceptance_criteria for the packet, return status='blocked'
- include diagnostic error_code='unregistered_acceptance_criterion'
```

Update `ValidationService._completion_diagnostics()` so `validate --all --packet-id <id>` reports the same missing acceptance coverage and missing gate coverage conditions that closeout would block.

- [ ] **Step 10: Run targeted tests**

Run:

```powershell
python -m unittest tests.evals.test_mvp_integrity_hardening
python -m unittest tests.contract.test_state_kernel
python -m unittest tests.contract.test_gate_results
python -m unittest tests.contract.test_readiness
python -m unittest tests.integration.test_closeout_flow
python -m unittest tests.integration.test_validate_command
python -m unittest tests.integration.test_first_low_risk_packet_flow
```

Expected:

```text
OK
```

- [ ] **Step 11: Run full regression suite**

Run:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
OK
```

Record the observed final test count from the actual run. Do not hard-code `38` after adding KFIX tests.

- [ ] **Step 12: Close KFIX-001 packet evidence**

Update `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`:

```markdown
Status: `closed`

Evidence:
- `python -m unittest tests.evals.test_mvp_integrity_hardening` returned `OK`.
- `python -m unittest discover -s tests` returned `OK` with the observed final test count.
```

- [ ] **Step 13: Commit**

Run:

```powershell
git add src/standard_harness tests/evals/test_mvp_integrity_hardening.py docs/implementation/standard-harness-post-mvp-work-packets-v1.md
git commit -m "fix: harden MVP integrity checks"
```

## Task RQ-01: Add GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Test: push-triggered GitHub Actions run

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read

jobs:
  test:
    name: Python unittest
    runs-on: windows-latest
    strategy:
      fail-fast: false
      matrix:
        python-version:
          - "3.12"
          - "3.13"
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Run tests
        run: python -m unittest discover -s tests
```

- [ ] **Step 2: Run local tests**

Run:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: add unittest workflow"
```

Expected:

```text
[main ...] ci: add unittest workflow
```

- [ ] **Step 4: Push**

Run:

```powershell
git push
```

Expected:

```text
main -> main
```

- [ ] **Step 5: Verify GitHub Actions**

Open:

```text
https://github.com/Heeyoung-Ahn/standard-harness-v2/actions
```

Expected:

```text
CI / Python unittest passes for Python 3.12 and Python 3.13.
```

If the GitHub UI cannot be inspected by the agent, record that limitation in the closeout note and rely on local tests plus subsequent human UI verification.

## Task RQ-02: Add Root README

**Files:**

- Create: `README.md`
- Create: `tests/integration/test_readme_commands.py`

- [ ] **Step 1: Write README command contract test**

Create `tests/integration/test_readme_commands.py` with:

```python
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class ReadmeCommandTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_readme_exists_and_mentions_required_commands(self):
        readme = ROOT / "README.md"
        self.assertTrue(readme.exists())
        text = readme.read_text(encoding="utf-8")
        for expected in [
            "python -m unittest discover -s tests",
            "python tools/harness_cli.py --json --harness-root",
            "validate --all",
            "starter/standard-harness",
        ]:
            self.assertIn(expected, text)

    def test_readme_init_command_shape_works(self):
        import json
        import subprocess

        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [
                    sys.executable,
                    str(CLI),
                    "--json",
                    "--harness-root",
                    tmp,
                    "init",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(json.loads(result.stdout)["status"], "ok")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the README test and confirm RED**

Run:

```powershell
python -m unittest tests.integration.test_readme_commands
```

Expected:

```text
FAILED
```

because `README.md` does not exist yet.

- [ ] **Step 3: Create README**

Create `README.md` with these sections:

```markdown
# Standard Harness v2

Standard Harness v2 is a repository-embedded quality kernel for LLM-assisted product development.

The MVP proves this chain:

```text
initialize state
-> create low-risk packet
-> register requirements and acceptance criteria
-> register evidence
-> record claims
-> record gate result
-> close or block packet
-> regenerate current context
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

Use an isolated harness root for experiments:

```powershell
python tools/harness_cli.py --json --harness-root C:\tmp\standard-harness-demo init
```

Validate a packet:

```powershell
python tools/harness_cli.py --json --harness-root C:\tmp\standard-harness-demo validate --all --packet-id pkt-001
```

## Starter Payload

The clean starter payload lives under:

```text
starter/standard-harness
```

The development repository root is not the starter payload.

## Release Quality

Release-quality checks are tracked in:

```text
docs/implementation/standard-harness-post-mvp-release-quality-plan-v1.md
docs/implementation/standard-harness-post-mvp-work-packets-v1.md
```
```

- [ ] **Step 4: Run README test and full tests**

Run:

```powershell
python -m unittest tests.integration.test_readme_commands
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add README.md tests/integration/test_readme_commands.py
git commit -m "docs: add release-ready README"
```

## Task RQ-03: Document GitHub CLI PATH and Auth Check

**Files:**

- Create: `docs/release/gh-cli-environment-check-v1.md`

- [ ] **Step 1: Create the environment check document**

Create `docs/release/gh-cli-environment-check-v1.md` with:

```markdown
# GitHub CLI Environment Check v1

## Purpose

This document records how maintainers verify GitHub CLI availability after installation.

## Windows Check

Run:

```powershell
gh --version
```

If the current shell does not see `gh`, run:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" --version
```

Expected:

```text
gh version 2.95.0
```

Open a new PowerShell session after installation so PATH changes are loaded.

## Authentication Check

Run:

```powershell
gh auth status
```

Expected:

```text
Logged in to github.com
```

If authentication is missing, run:

```powershell
gh auth login
```

Choose GitHub.com, HTTPS, and browser authentication.

## Push Check

Run:

```powershell
git remote -v
git push
```

Expected:

```text
origin https://github.com/Heeyoung-Ahn/standard-harness-v2.git
Everything up-to-date
```
```

- [ ] **Step 2: Commit**

Run:

```powershell
git add docs/release/gh-cli-environment-check-v1.md
git commit -m "docs: add GitHub CLI environment check"
```

## Task RQ-04: Add Release Tag Decision Record

**Files:**

- Create: `docs/decisions/DR-0001-release-tag-policy.md`

- [ ] **Step 1: Create the decision record**

Create `docs/decisions/DR-0001-release-tag-policy.md` with:

```markdown
# DR-0001 Release Tag Policy

## Status

Proposed

## Context

The MVP implementation is complete and pushed to GitHub. Release tagging must distinguish stable MVP evidence from later release-quality polish and deferred roadmap work.

## Decision

Use `v0.1.0-mvp` for the first MVP tag after the following are true:

- CI workflow exists and passes.
- `README.md` documents setup, test, CLI, validation, and starter boundaries.
- `CHANGELOG.md` records the MVP feature set.
- `docs/release/mvp-completion-note-v1.md` records verification evidence.
- Deferred final-product work is represented as GitHub issues.

Do not tag before those release-quality checks are complete.

## Consequences

The current pushed commit remains a development baseline. The tag marks the first release-quality MVP baseline, not merely the first implementation commit.

## Tag Command

After approval:

```powershell
git tag -a v0.1.0-mvp -m "Standard Harness v2 MVP"
git push origin v0.1.0-mvp
```
```

- [ ] **Step 2: Commit**

Run:

```powershell
git add docs/decisions/DR-0001-release-tag-policy.md
git commit -m "docs: add MVP release tag policy"
```

## Task RQ-05: Add Changelog and MVP Completion Note

**Files:**

- Create: `CHANGELOG.md`
- Create: `docs/release/mvp-completion-note-v1.md`

- [ ] **Step 1: Create CHANGELOG**

Create `CHANGELOG.md` with:

```markdown
# Changelog

## Unreleased

### Added

- Post-MVP release-quality planning documents.
- GitHub Actions CI plan.
- Deferred work issue conversion plan.

## 0.1.0-mvp

### Added

- Python standard-library CLI wrapper and command dispatcher.
- Repo-embedded SQLite state kernel.
- Append-only event log with idempotency keys and payload hashes.
- Packet lifecycle, approval records, and lifecycle transitions.
- Manual requirement, acceptance criterion, and artifact registries.
- Evidence manifest and claim ledger.
- Readiness diagnostics.
- Gate declaration, activation, and gate result model.
- Closeout records with blocked and closed outcomes.
- Current context projection with freshness metadata and persistence.
- Adapter manifest and output envelope skeleton.
- Starter manifest and contamination checks.
- Missing-evidence behavioral eval.
- First low-risk packet end-to-end integration flow.
- Validate command aggregator.
```

- [ ] **Step 2: Create MVP completion note**

Create `docs/release/mvp-completion-note-v1.md` with:

```markdown
# Standard Harness v2 MVP Completion Note v1

## Commit

`98cd79f Implement Standard Harness v2 MVP`

## Repository

`https://github.com/Heeyoung-Ahn/standard-harness-v2`

## Scope Completed

- MVP-00 through MVP-13 from `docs/implementation/standard-harness-implementation-plan-v1.md`
- Starter payload seed documents
- Contract, integration, and eval tests

## Verification

Run:

```powershell
python -m unittest discover -s tests
```

Observed baseline:

```text
Ran 38 tests
OK
```

Observed after `KFIX-001` and release-quality changes:

```text
Ran <actual final test count> tests
OK
```

Use the actual final test count from the latest `python -m unittest discover -s tests` run.

## Boundaries Preserved

- No external Python packages are required.
- Generated Markdown is not canonical state.
- Tests use isolated temporary harness roots.
- The development `.harness/state/harness.sqlite3` is not required for tests.
- Deferred work remains staged, not rejected.
```

- [ ] **Step 3: Run full tests**

Run:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add CHANGELOG.md docs/release/mvp-completion-note-v1.md
git commit -m "docs: record MVP completion"
```

## Task RQ-06: Convert Deferred Work Register to Issues

**Files:**

- Create: `docs/release/deferred-work-issue-plan-v1.md`

- [ ] **Step 1: Create deferred issue plan**

Create `docs/release/deferred-work-issue-plan-v1.md` with the issue titles, labels, and bodies from `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`.

- [ ] **Step 2: Verify GitHub CLI auth**

Run:

```powershell
gh auth status
```

If `gh` is not on PATH in the current shell, run:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Expected:

```text
Logged in to github.com
```

- [ ] **Step 3: Create labels**

Run:

```powershell
gh label create deferred --description "Deferred final-product work" --color 6f42c1
gh label create roadmap --description "Roadmap planning item" --color 0366d6
gh label create conformance --description "Conformance-level capability" --color 28a745
gh label create release-quality --description "Post-MVP release quality" --color fbca04
```

If a label already exists, record the message and continue.

- [ ] **Step 4: Create deferred issues**

Create one issue for each deferred work item:

```powershell
gh issue create --title "Deferred: Automated SSOT extraction" --label deferred --label roadmap --body-file docs/release/issues/deferred-automated-ssot-extraction.md
gh issue create --title "Deferred: Semantic diff automation" --label deferred --label roadmap --body-file docs/release/issues/deferred-semantic-diff-automation.md
gh issue create --title "Deferred: Full adapter contract matrix" --label deferred --label conformance --body-file docs/release/issues/deferred-full-adapter-contract-matrix.md
gh issue create --title "Deferred: Browser cloud and device adapters" --label deferred --label conformance --body-file docs/release/issues/deferred-browser-cloud-device-adapters.md
gh issue create --title "Deferred: Dashboard" --label deferred --label roadmap --body-file docs/release/issues/deferred-dashboard.md
gh issue create --title "Deferred: Cloud orchestration" --label deferred --label roadmap --body-file docs/release/issues/deferred-cloud-orchestration.md
gh issue create --title "Deferred: High-integrity signing" --label deferred --label conformance --body-file docs/release/issues/deferred-high-integrity-signing.md
gh issue create --title "Deferred: Advanced Git reconciliation" --label deferred --label conformance --body-file docs/release/issues/deferred-advanced-git-reconciliation.md
```

- [ ] **Step 5: Commit issue plan documents**

Run:

```powershell
git add docs/release/deferred-work-issue-plan-v1.md docs/release/issues/
git commit -m "docs: add deferred work issue plan"
```

## Task RQ-07: Validate Starter Payload in a Sample Repository

**Files:**

- Create: `docs/release/starter-sample-validation-plan-v1.md`

- [ ] **Step 1: Create starter sample validation plan**

Create `docs/release/starter-sample-validation-plan-v1.md` with:

```markdown
# Starter Sample Validation Plan v1

## Goal

Validate that `starter/standard-harness/` can seed a separate project without copying development artifacts.

## Sample Location

Use:

```text
C:\tmp\standard-harness-sample
```

## Commands

Create a clean sample directory:

```powershell
New-Item -ItemType Directory -Force C:\tmp\standard-harness-sample
Copy-Item -Recurse starter\standard-harness\* C:\tmp\standard-harness-sample\
```

Run starter check against the copied sample root before initializing state:

```powershell
python tools\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample starter-check --root C:\tmp\standard-harness-sample
```

Expected:

```json
{"status":"ok"}
```

Initialize harness state in the sample after the starter payload is proven clean:

```powershell
python tools\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample init
```

## Evidence to Record

- Copy command completed.
- `starter-check` returned JSON status `ok`.
- `starter-check --root` verified README.md and START_HERE.md exist.
- No `.git`, `.agents`, `.codex`, `__pycache__`, logs, local evidence, or `.harness/state/harness.sqlite3` from the development repository were copied.
- `init` returned JSON status `ok`.
```

- [ ] **Step 2: Execute sample validation**

Run the commands in the plan. Use `C:\tmp\standard-harness-sample` only.

- [ ] **Step 3: Record observed results**

Append an `Observed Results` section to `docs/release/starter-sample-validation-plan-v1.md`:

```markdown
## Observed Results

- Copy completed.
- `init` returned status `ok`.
- `starter-check --root` returned status `ok`.
- No forbidden development artifacts were present in the copied starter sample.
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add docs/release/starter-sample-validation-plan-v1.md
git commit -m "docs: add starter sample validation evidence"
```

## Task RQ-08: Final Release-Quality Closeout

**Files:**

- Modify: `docs/release/mvp-completion-note-v1.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run final verification**

Run:

```powershell
python -m unittest discover -s tests
git status --short
```

Expected:

```text
OK
```

and no uncommitted tracked changes.

- [ ] **Step 2: Push all release-quality commits**

Run:

```powershell
git push
```

Expected:

```text
main -> main
```

- [ ] **Step 3: Decide whether to tag**

If `docs/decisions/DR-0001-release-tag-policy.md` status is changed from `Proposed` to `Accepted`, run:

```powershell
git tag -a v0.1.0-mvp -m "Standard Harness v2 MVP"
git push origin v0.1.0-mvp
```

If the decision remains `Proposed`, do not create a tag.

- [ ] **Step 4: Closeout report**

Final report must include:

```text
- CI status
- README status
- GitHub CLI PATH/auth status
- changelog status
- release tag decision
- deferred issues created or documented
- starter sample validation status
- final test command and result
```

## Self-Review Checklist

- [ ] CI command matches the local test command.
- [ ] README commands use `--harness-root` and do not touch development `.harness/state`.
- [ ] Deferred work is represented as roadmap issues, not removed requirements.
- [ ] Release tag is gated by a decision record.
- [ ] Starter sample validation uses `C:\tmp` and not the development repository state.
- [ ] Final report includes fresh verification output.
