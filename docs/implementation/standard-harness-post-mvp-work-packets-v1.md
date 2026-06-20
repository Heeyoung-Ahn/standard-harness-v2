# Standard Harness Post-MVP Work Packets v1

## Purpose

This document turns post-MVP release-quality work and deferred final-product work into explicit work packets.

The MVP implementation is complete at the baseline test level. These packets do not redefine MVP scope. `KFIX-001` must run before release-quality work because review found completion-integrity defects in the MVP kernel. The remaining packets improve release quality, repository operability, and roadmap traceability after MVP.

## Packet Rules

- Each packet must preserve the existing MVP state, evidence, gate, and closeout behavior.
- `KFIX-001` may tighten invalid MVP state, evidence, gate, and closeout behavior, but must not add deferred final-product capabilities.
- Each implementation packet must close with fresh verification evidence.
- Documentation-only packets must still record review evidence.
- Deferred final-product packets must be created as GitHub issues before they are treated as tracked roadmap work.
- Deferred work is staged, not rejected.

## Packet Status Enum

Allowed packet statuses in this document:

```text
planned
in_progress
blocked
closed
deferred
```

## Release-Quality Packets

### REL-000 Baseline Verification

Status: `closed`

Owner: Maintainer

Goal: Confirm the pushed MVP baseline is clean before release-quality changes start.

Scope:

- Run full local test suite.
- Confirm working tree is clean.
- Confirm current GitHub remote is `Heeyoung-Ahn/standard-harness-v2`.

Acceptance criteria:

- `python -m unittest discover -s tests` returns `OK`.
- `git status --short` prints no tracked changes.
- `git remote -v` contains `https://github.com/Heeyoung-Ahn/standard-harness-v2.git`.

Evidence command:

```powershell
python -m unittest discover -s tests
git status --short
git remote -v
```

Closeout condition:

```text
All three acceptance criteria are met and recorded in the final closeout report.
```

Evidence:

- `python -m unittest discover -s tests` passed with 38 tests at baseline.
- `git remote -v` contains `https://github.com/Heeyoung-Ahn/standard-harness-v2.git`.

### KFIX-001 MVP Integrity Hardening

Status: `closed`

Owner: Maintainer

Goal: Block false MVP completion before release-quality work starts.

Why this precedes release-quality:

The baseline MVP test suite passes, but additional review identified invalid completion paths that can let a packet close without full acceptance coverage, let a gate pass with evidence unrelated to checked claims, and let event state drift through stale or duplicate writes. CI, README, changelog, and release tagging should not certify that behavior.

Scope:

- Add negative regression tests for completion integrity defects.
- Harden closeout acceptance-criterion coverage.
- Harden gate result claim-evidence linkage.
- Reject duplicate entity ids with new idempotency keys before appending events.
- Reject stale `expected_state_version` writes.
- Add registry referential integrity checks for packet, requirement, acceptance criterion, evidence, and claim writes.
- Add readiness registry reconciliation for packet acceptance criterion ids.

Out of scope:

- Automated SSOT extraction.
- Semantic diff automation.
- Adapter matrix expansion.
- Browser, cloud, or device adapters.
- Dashboard work.
- High-integrity signing.
- Any change that treats generated Markdown as canonical state.

Acceptance criteria:

- `closeout` returns `blocked` when any packet acceptance criterion lacks a supported claim.
- `closeout` returns `blocked` when passing gate results do not cover the claims used for closeout.
- `gate-record --status pass` rejects evidence that is not linked to each checked claim.
- Duplicate entity ids with a new idempotency key are rejected before a new event is appended.
- `HarnessStore.append_event(expected_state_version=...)` rejects stale expected versions.
- Registry writes reject unknown packets, unknown requirements, cross-packet acceptance criteria, and cross-packet evidence.
- `readiness` blocks when packet acceptance criterion ids are not registered for the packet.
- Existing first low-risk packet flow still closes successfully.
- Full local test suite returns `OK`.

Evidence command:

```powershell
python -m unittest tests.evals.test_mvp_integrity_hardening
python -m unittest discover -s tests
```

Required implementation plan:

```text
docs/implementation/standard-harness-post-mvp-release-quality-plan-v1.md
Task KFIX-001: MVP Integrity Hardening
```

Issue title:

```text
Kernel Fix: MVP integrity hardening
```

Labels:

```text
release-quality
integrity
kernel
```

Closeout condition:

```text
All KFIX-001 acceptance criteria are met, the new negative tests pass, and the final test count is recorded from the actual full test run.
```

Evidence:

- `python -m unittest tests.evals.test_mvp_integrity_hardening` passed with 7 tests.
- KFIX targeted suite passed with 22 tests.
- `python -m unittest discover -s tests` passed with 45 tests after KFIX and 49 tests after release-quality additions.

### REL-001 GitHub Actions CI

Status: `blocked`

Owner: Maintainer

Goal: Ensure every push and pull request runs the MVP test suite in GitHub Actions.

Scope:

- Create `.github/workflows/ci.yml`.
- Run `python -m unittest discover -s tests` on Windows GitHub-hosted runners.
- Test Python 3.12 and Python 3.13.

Acceptance criteria:

- Workflow exists at `.github/workflows/ci.yml`.
- Workflow runs on `push` and `pull_request` to `main`.
- Workflow uses `actions/checkout@v4`.
- Workflow uses `actions/setup-python@v5`.
- Workflow command is `python -m unittest discover -s tests`.

Evidence command:

```powershell
python -m unittest discover -s tests
git push
```

Remote evidence:

```text
GitHub Actions run for CI passes.
```

Observed status:

```text
.github/workflows/ci.yml exists locally.
Release-quality commit 5a44093 was pushed to main.
Remote GitHub Actions UI/status verification is blocked until GitHub CLI authentication or browser-authenticated inspection is available.
```

Issue title:

```text
Release Quality: Add GitHub Actions CI
```

Labels:

```text
release-quality
ci
```

### REL-002 Root README

Status: `closed`

Owner: Maintainer

Goal: Make the repository usable from GitHub without reading internal implementation plans first.

Scope:

- Create root `README.md`.
- Document MVP purpose.
- Document Python version requirements.
- Document test command.
- Document CLI command shape using `--json` and `--harness-root`.
- Document starter payload boundary.

Acceptance criteria:

- `README.md` exists.
- README includes `python -m unittest discover -s tests`.
- README includes `python tools/harness_cli.py --json --harness-root`.
- README includes `validate --all`.
- README identifies `starter/standard-harness` as the clean starter payload.

Evidence command:

```powershell
python -m unittest tests.integration.test_readme_commands
python -m unittest discover -s tests
```

Issue title:

```text
Release Quality: Add root README
```

Labels:

```text
release-quality
documentation
```

Evidence:

- `README.md` exists.
- `python -m unittest tests.integration.test_readme_commands` passed.
- `python -m unittest discover -s tests` passed with 49 tests.

### REL-003 GitHub CLI Environment Check

Status: `closed`

Owner: Maintainer

Goal: Record how maintainers verify GitHub CLI installation, PATH availability, and authentication.

Scope:

- Create `docs/release/gh-cli-environment-check-v1.md`.
- Include Windows absolute-path fallback for `gh.exe`.
- Include `gh auth status`.
- Include push check.

Acceptance criteria:

- Document includes `gh --version`.
- Document includes `C:\Program Files\GitHub CLI\gh.exe`.
- Document includes `gh auth status`.
- Document includes `git push`.

Evidence command:

```powershell
gh --version
gh auth status
git push
```

Fallback command:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" --version
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Issue title:

```text
Release Quality: Document GitHub CLI environment check
```

Labels:

```text
release-quality
documentation
```

Evidence:

- `docs/release/gh-cli-environment-check-v1.md` exists.
- Fallback GitHub CLI exists at `C:\Program Files\GitHub CLI\gh.exe`.
- GitHub CLI auth is blocked: not logged into any GitHub hosts.

### REL-004 Release Tag Policy

Status: `closed`

Owner: Human Owner

Goal: Decide when `v0.1.0-mvp` should be created.

Scope:

- Create `docs/decisions/DR-0001-release-tag-policy.md`.
- Keep the initial status as `Proposed`.
- Require CI, README, changelog, completion note, and deferred issues before tagging.

Acceptance criteria:

- Decision record exists.
- Decision record names `v0.1.0-mvp`.
- Decision record explains that the tag is not created before release-quality checks pass.
- Tag command is documented but not executed until decision status is `Accepted`.

Evidence command:

```powershell
git tag --list
```

Issue title:

```text
Release Quality: Decide MVP release tag policy
```

Labels:

```text
release-quality
decision
```

Evidence:

- `docs/decisions/DR-0001-release-tag-policy.md` exists.
- Decision status remains `Proposed`.
- `v0.1.0-mvp` tag was not created.

### REL-005 Changelog and MVP Completion Note

Status: `closed`

Owner: Maintainer

Goal: Record what the MVP contains and what verification evidence supports it.

Scope:

- Create `CHANGELOG.md`.
- Create `docs/release/mvp-completion-note-v1.md`.
- Record commit `98cd79f Implement Standard Harness v2 MVP`.
- Record repository URL.
- Record full test result.

Acceptance criteria:

- `CHANGELOG.md` includes `0.1.0-mvp`.
- Completion note identifies the MVP commit.
- Completion note identifies the GitHub repo.
- Completion note records the MVP baseline verification as 38 tests passed.
- Completion note records the post-`KFIX-001` final verification with the actual observed test count.
- Completion note preserves deferred work as staged work.

Evidence command:

```powershell
python -m unittest discover -s tests
git log -1 --oneline
```

Issue title:

```text
Release Quality: Add changelog and MVP completion note
```

Labels:

```text
release-quality
documentation
```

Evidence:

- `CHANGELOG.md` exists.
- `docs/release/mvp-completion-note-v1.md` exists.
- Completion note records baseline, KFIX, and final release-quality verification counts.

### REL-006 Deferred Work Issue Conversion

Status: `blocked`

Owner: Planner

Goal: Convert deferred final-product work into GitHub issues so the roadmap remains visible and traceable.

Scope:

- Create issue body files under `docs/release/issues/`.
- Create labels for deferred work.
- Create one GitHub issue per deferred work item.

Acceptance criteria:

- Each deferred item in this document has an issue body.
- Each issue body states that the work is staged, not rejected.
- Each issue body references relevant requirement anchors where known.
- GitHub issues are created or issue creation is blocked with a recorded authentication reason.

Evidence command:

```powershell
gh issue list --label deferred
```

Fallback command:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" issue list --label deferred
```

Issue title:

```text
Release Quality: Convert deferred work register to GitHub issues
```

Labels:

```text
release-quality
roadmap
```

Observed status:

```text
docs/release/deferred-work-issue-plan-v1.md exists.
docs/release/issues/*.md issue body files exist.
Remote issue creation is blocked because GitHub CLI is not authenticated.
```

### REL-007 Starter Sample Repository Validation

Status: `closed`

Owner: Tester

Goal: Prove the clean starter payload can be copied into a separate sample directory without carrying development artifacts.

Scope:

- Use `C:\tmp\standard-harness-sample`.
- Copy `starter/standard-harness/` into the sample.
- Run starter contamination check against the copied sample root before state initialization.
- Initialize harness state in the sample root after the copied payload is proven clean.
- Record observed results in `docs/release/starter-sample-validation-plan-v1.md`.

Acceptance criteria:

- Sample directory is outside the development repository.
- `init` returns JSON status `ok`.
- `starter-check --root` returns JSON status `ok`.
- `starter-check --root` verifies `README.md` and `START_HERE.md` exist in the sample root.
- No development `.git`, `.agents`, `.codex`, `__pycache__`, logs, local evidence, or development `.harness/state/harness.sqlite3` are copied.

Evidence command:

```powershell
New-Item -ItemType Directory -Force C:\tmp\standard-harness-sample
Copy-Item -Recurse starter\standard-harness\* C:\tmp\standard-harness-sample\
python tools\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample starter-check --root C:\tmp\standard-harness-sample
python tools\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample init
```

Issue title:

```text
Release Quality: Validate starter payload in sample repository
```

Labels:

```text
release-quality
starter
```

Evidence:

- `docs/release/starter-sample-validation-plan-v1.md` exists.
- `starter-check --root C:\tmp\standard-harness-sample` returned `status: ok` before sample initialization.
- Sample `init` returned `status: ok` after the copied payload was proven clean.

### REL-008 Final Release-Quality Closeout

Status: `closed`

Owner: Maintainer

Goal: Record final MVP release-quality evidence and remote-operation blockers.

Scope:

- Run final full local test suite.
- Record GitHub CLI and remote operation status.
- Record release tag decision status.
- Record MVP use scope and excluded final-product scope.

Acceptance criteria:

- `docs/release/release-quality-closeout-v1.md` exists.
- Final full test result is recorded.
- CI, README, GitHub CLI, changelog, release tag, deferred issue, and starter sample statuses are recorded.
- Remote blockers are explicit.

Evidence command:

```powershell
python -m unittest discover -s tests
git status --short
```

Evidence:

- `python -m unittest discover -s tests` passed with 49 tests.
- `docs/release/release-quality-closeout-v1.md` records GitHub CLI authentication blocker and final-product exclusions.

## Deferred Final-Product Work Packets

### DEF-001 Automated SSOT Extraction

Status: `deferred`

Conformance target: Standard

Goal: Extract requirements from approved SSOT documents with stable identifiers, source references, and parser confidence metadata.

Why deferred:

The MVP intentionally uses manual requirement registration to prove packet/evidence/gate correctness before automating extraction.

Expected issue title:

```text
Deferred: Automated SSOT extraction
```

Labels:

```text
deferred
roadmap
conformance
```

Issue body:

```markdown
# Deferred: Automated SSOT extraction

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement automated extraction of requirements from approved SSOT documents while preserving stable requirement ids, source document references, source ranges, parser confidence, and reviewability.

## MVP Boundary

The MVP supports manual requirement registration. This issue must not weaken the manual registry or allow unverified extraction output to become authoritative completion state.

## Acceptance Criteria

- Extracted requirements include stable ids, version, source document, source range, status, classification, risk classification, acceptance criteria, and completion classification.
- Extraction output is reviewable before promotion.
- Promotion appends events rather than mutating canonical tables directly.
- Low-confidence parser output produces structured diagnostics.

## Verification

- Contract tests prove extracted requirements are not promoted without explicit approval.
- Negative tests prove generated text alone cannot satisfy a requirement.
```

### DEF-002 Semantic Diff Automation

Status: `deferred`

Conformance target: Standard

Goal: Detect semantic changes in requirements and route impacted packets, claims, evidence, gates, and projections for review.

Why deferred:

The MVP validates freshness by event watermark and does not attempt semantic dependency analysis.

Expected issue title:

```text
Deferred: Semantic diff automation
```

Labels:

```text
deferred
roadmap
conformance
```

Issue body:

```markdown
# Deferred: Semantic diff automation

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement semantic change detection that identifies when requirement meaning changes and invalidates affected claims, evidence, gates, projections, and closeout assumptions.

## MVP Boundary

The MVP uses explicit event watermarks and manual registry changes. This issue must preserve the rule that stale or unverified evidence cannot become supported completion.

## Acceptance Criteria

- Semantic diff results classify changed, unchanged, moved, removed, and ambiguous requirement content.
- Impacted packet ids, requirement ids, acceptance criterion ids, evidence ids, and projection ids are listed.
- Ambiguous diffs produce diagnostics requiring human review.
- Diff output is not canonical state until promoted by an event.

## Verification

- Tests cover wording-only changes, meaning changes, moved sections, deleted requirements, and ambiguous parser output.
```

### DEF-003 Full Adapter Contract Matrix

Status: `deferred`

Conformance target: Standard

Goal: Expand the adapter skeleton into a matrix covering success, failure, stale output, partial output, permission boundaries, artifact export, and evidence provenance.

Why deferred:

The MVP includes manifest and envelope validation only.

Expected issue title:

```text
Deferred: Full adapter contract matrix
```

Labels:

```text
deferred
conformance
adapter
```

Issue body:

```markdown
# Deferred: Full adapter contract matrix

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Define and test a complete adapter contract matrix across execution modes, evidence modes, permission roots, artifact export behavior, and failure classifications.

## MVP Boundary

The MVP rejects direct state mutation and mock-success production evidence. This issue expands coverage without weakening those boundaries.

## Acceptance Criteria

- Matrix includes success, fail, blocked, stale, substitute, not applicable, partial output, timeout, permission denied, and malformed envelope cases.
- Tests verify adapter outputs request events rather than writing state directly.
- Tests verify mock adapters cannot satisfy production evidence gates.

## Verification

- Contract test suite runs without external services.
- Adapter fixtures are deterministic and isolated.
```

### DEF-004 Browser, Cloud, and Device Adapters

Status: `deferred`

Conformance target: Standard or Advanced depending on adapter class

Goal: Implement real adapters for browser functional evidence, cloud evidence, and device evidence while preserving provenance and permission boundaries.

Why deferred:

The MVP proves provider-neutral adapter boundaries first.

Expected issue title:

```text
Deferred: Browser cloud and device adapters
```

Labels:

```text
deferred
adapter
conformance
```

Issue body:

```markdown
# Deferred: Browser cloud and device adapters

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement adapters that can produce browser functional evidence, cloud execution evidence, and device execution evidence with explicit provenance and failure modes.

## MVP Boundary

The MVP does not equate screenshots, logs, or mock output with production evidence. This issue must preserve that distinction.

## Acceptance Criteria

- Browser adapter distinguishes rendering evidence from functional evidence.
- Cloud adapter records project, region, identity, command, and artifact provenance.
- Device adapter records target identity, environment fingerprint, command, and result.
- Adapters cannot mutate canonical state directly.

## Verification

- Contract tests cover permission roots, stale output, failed output, and missing provenance.
```

### DEF-005 Dashboard

Status: `deferred`

Conformance target: Advanced

Goal: Provide a visual dashboard over packets, evidence, claims, gates, diagnostics, projections, and closeout status.

Why deferred:

The MVP must prove kernel correctness before UI.

Expected issue title:

```text
Deferred: Dashboard
```

Labels:

```text
deferred
roadmap
dashboard
```

Issue body:

```markdown
# Deferred: Dashboard

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Build a dashboard that reads canonical state and generated projections without becoming canonical state itself.

## MVP Boundary

The dashboard must not replace the SQLite state kernel, append-only events, or validation CLI.

## Acceptance Criteria

- Dashboard clearly shows packet lifecycle, approval state, evidence status, claim support, gate status, closeout decision, diagnostics, and projection freshness.
- Dashboard reads state through approved read APIs or projections.
- Dashboard cannot mark claims supported or gates passed by UI text alone.

## Verification

- Tests prove stale projection warnings are visible.
- Tests prove unsupported claims remain blocked.
```

### DEF-006 Cloud Orchestration

Status: `deferred`

Conformance target: Advanced

Goal: Coordinate remote agents, state synchronization, and controlled cloud execution while preserving local auditability.

Why deferred:

The MVP remains repo-embedded and locally auditable.

Expected issue title:

```text
Deferred: Cloud orchestration
```

Labels:

```text
deferred
roadmap
cloud
```

Issue body:

```markdown
# Deferred: Cloud orchestration

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement cloud orchestration for remote work execution while preserving packet authority, evidence provenance, and state synchronization.

## MVP Boundary

Cloud execution must not bypass local state, approval records, evidence requirements, or gate enforcement.

## Acceptance Criteria

- Remote work has explicit packet id, actor identity, permission roots, and evidence output.
- State synchronization is event-based.
- Network or cloud failures produce structured diagnostics.
- Local audit remains possible without cloud dashboard access.

## Verification

- Tests simulate remote success, remote failure, stale output, and missing provenance.
```

### DEF-007 High-Integrity Signing

Status: `deferred`

Conformance target: High-Integrity

Goal: Add cryptographic signing, tamper-evidence, stronger identity, and retention controls for high-integrity deployments.

Why deferred:

The MVP has local hashes and approval records but not enterprise-grade signing.

Expected issue title:

```text
Deferred: High-integrity signing
```

Labels:

```text
deferred
conformance
high-integrity
```

Issue body:

```markdown
# Deferred: High-integrity signing

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement high-integrity signing and tamper-evidence for events, approvals, evidence manifests, gate results, closeouts, and projections.

## MVP Boundary

Existing SHA-256 hashes remain useful for MVP integrity but are not presented as enterprise-grade signatures.

## Acceptance Criteria

- Signing keys and identity metadata are managed explicitly.
- Signed records include event payload, actor identity, timestamp, source watermark, and signature metadata.
- Verification detects tampering.
- Retention and export behavior are documented.

## Verification

- Tests cover valid signatures, invalid signatures, missing signatures, rotated keys, and tampered payloads.
```

### DEF-008 Advanced Git Reconciliation

Status: `deferred`

Conformance target: Standard or Advanced depending on operation

Goal: Reconcile branches, worktrees, moved artifacts, deleted artifacts, unregistered changes, event import/export, and external-tool drift.

Why deferred:

The MVP avoids automatic merge, rebase, cherry-pick, and multi-branch reconciliation.

Expected issue title:

```text
Deferred: Advanced Git reconciliation
```

Labels:

```text
deferred
conformance
git
```

Issue body:

```markdown
# Deferred: Advanced Git reconciliation

## Status

Deferred from MVP. Staged, not rejected.

## Goal

Implement advanced Git reconciliation for branches, worktrees, moved artifacts, deleted artifacts, unregistered changes, and event import/export.

## MVP Boundary

No automatic merge, rebase, cherry-pick, or multi-branch reconciliation is part of MVP. This issue must preserve packet ownership and evidence traceability.

## Acceptance Criteria

- Reconciliation detects unregistered changes in packet-owned zones.
- Moved and deleted artifacts are represented by events.
- Branch or worktree identity is captured in evidence and diagnostics.
- Automatic repair requires explicit approval when it changes source files.

## Verification

- Tests cover branch switch, untracked files, ignored files, moved files, deleted files, merge conflict, and stale event import.
```

## Release Readiness Gate

The release-quality phase is closed only when all are true:

- `KFIX-001 MVP Integrity Hardening` is closed.
- `python -m unittest discover -s tests` returns `OK`.
- GitHub Actions CI passes, or remote verification is blocked with an explicit authentication or push blocker.
- README exists and command snippets are covered by tests.
- GitHub CLI environment check is documented.
- Release tag policy decision exists.
- Changelog and MVP completion note exist.
- Deferred work issues are created or issue creation blockers are recorded.
- Starter sample validation is executed or an explicit blocker is recorded.
- Final release-quality closeout exists.
- No generated Markdown is treated as canonical runtime state.

## Recommended Execution Order

```text
REL-000 baseline verification
KFIX-001 MVP integrity hardening
REL-001 GitHub Actions CI
REL-002 root README
REL-003 GitHub CLI environment check
REL-004 release tag policy
REL-005 changelog and MVP completion note
REL-006 deferred work issue conversion
REL-007 starter sample repository validation
REL-008 final release-quality closeout
DEF-001 through DEF-008 issue creation
release readiness gate
```
