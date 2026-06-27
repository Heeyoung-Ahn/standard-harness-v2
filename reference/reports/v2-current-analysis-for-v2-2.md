# Standard Harness v2 Current Analysis for v2.2 Direction

## Status
- Main-agent report revised after independent Challenge Reviewer and Critical Reviewer review.
- Review target: current `starter/standard-harness/` v2 payload, root v1 operating harness, and legacy v2 reference archive.
- Purpose: decide how to upgrade the current v2.1 payload toward v2.2 without losing the v2 philosophy.

## Source Basis
- Current root governance:
  - `AGENTS.md`
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/planning/PLN-00_DEEP_INTERVIEW.md`
  - `reference/packets/PKT-01_PROJECT_OPERATING_FOLDER_CONTRACT.md`
- Current v2 payload:
  - `starter/standard-harness/README.md`
  - `starter/standard-harness/START_HERE.md`
  - `starter/standard-harness/_harness/README.md`
  - `starter/standard-harness/_harness/policies/project-operating-folders.yaml`
  - `starter/standard-harness/_harness/policies/agent-permissions.yaml`
  - `starter/standard-harness/_harness/policies/role-routing.yaml`
  - `starter/standard-harness/_harness/catalog/skill-catalog.yaml`
  - `starter/standard-harness/_harness/catalog/minimum-required-skills.yaml`
  - `starter/standard-harness/_harness/system/standard_harness/**`
- Legacy v2/v1 reference:
  - `reference/legacy/current-root-v2-docs/docs/requirements/standard-harness-integrated-requirements-v0.2.md`
  - `reference/legacy/current-root-v2-docs/docs/requirements/standard-harness-v2-1-integrated-work-plan.md`
  - `reference/legacy/current-root-v2-docs/root/README.md`
  - `reference/legacy/current-root-v2-docs/root/AGENTS.md`
- Commands/evidence checked:
  - `reference/reports/v2-current-analysis-evidence-ledger.md`
  - `python _harness\bin\harness_cli.py --json --harness-root . validate --starter` from `starter/standard-harness/`: pass, diagnostics empty, but not sufficient clean-export evidence.
  - `python _harness\bin\harness_cli.py --json --harness-root . starter-check` from `starter/standard-harness/`: pass, diagnostics empty, but not sufficient clean-export evidence.
  - `python _harness\bin\harness_cli.py --help`: exposes only generic dispatcher help, not usable subcommand help.
  - Starter payload file count after cleanup: 228 files: 161 `.py`, 25 `.yaml`, 21 `.json`, 18 `.gitkeep`, 3 `.md`.
  - Starter Python runtime scale: 236 Python files under `_harness/system/standard_harness`, about 15,529 lines.
  - Root v1 test surface: 61 files under `.harness/test`.
  - Legacy archive: 95 files; largest legacy Markdown files range from 437 to 1,426 lines.

## Executive Judgment
Current v2 is directionally aligned with the stated v2 philosophy, but it is not yet practically productized.

The strongest part is the conceptual boundary: `_harness/`, `_ops/`, and `product/` are documented and partially enforced; `starter/standard-harness/AGENTS.md` is absent; provider-specific routing is kept as an example; and the starter validates as clean under its current validator.

That "validates as clean" statement has a major caveat: current validation acceptance is not the same as clean payload export readiness. Running the Python CLI can generate `__pycache__` inside the starter tree, and the validator may still pass in installed/copied mode because runtime-generated cache diagnostics are suppressed. This is a v2.2 blocker for productization, not a minor cleanup issue.

The weakest part is operational proof. The payload contains many advanced modules and contracts, but the copied-starter user path is still thin: `START_HERE.md` is short, subcommand help is poor, there is no packaged starter-native test suite or clear harness self-test command, and several catalog entries reference `tests.contract.*` paths that are not present in the starter payload. This makes v2 look more complete than it can prove in a new repository.

The v2.2 upgrade should therefore focus on turning the existing philosophy into a minimal, executable operating loop rather than importing more v1 material.

## Question 1: Is v2 Being Implemented According To Its Goals?

### Strong Alignment
- Clean payload identity is correct. Root `AGENTS.md` is explicitly development-only and `starter/standard-harness/AGENTS.md` is absent.
- Folder philosophy is aligned. `_harness/README.md`, `START_HERE.md`, and `project-operating-folders.yaml` consistently describe `_harness/` as harness system, `_ops/` as AI/validator operating ledger, and `product/` as source/tests/human docs.
- Human document placement is aligned. `product/docs/project`, `product/docs/packets`, and `product/docs/pmo` exist as seed folders, and `product/docs` is declared as the human-facing documentation surface.
- Provider-neutral intent is visible. `role-routing.yaml` uses `policy-selected` and `manual-handoff`; Codex/Claude routing appears only under `_harness/examples/role-routing.codex-claude.yaml` with `exampleOnly: true`.
- Long-memory and documenter direction exists in code and policies. `documenter/closeout_report.py`, `wiki/applier.py`, `wiki/proposals.py`, wiki schemas, wiki policy, context authority, friction, metrics, and starter promotion schemas all exist.
- Evidence-first direction exists. CLI commands include packet, requirement, acceptance, artifact, evidence, claim, gate, readiness, closeout, context, handoff, skill-route, and validation operations.
- Contamination protection exists as a mechanism, but not yet as sufficient clean-export proof. `StarterContaminationChecker` can classify provider-specific entry contracts, root `.agents/.codex`, local state, logs, caches, secrets, generated validation reports, release evidence, and missing required paths. However, runtime-generated cache allowance means a passing validation result must not be treated as final clean payload evidence.

### Partial Or Weak Alignment
- The folder contract is stronger in documentation than in operational UX. `init` recreates `_ops/**` and `product/**`, but there is no explicit `ops-reset` command even though reset behavior is part of the product concept.
- `validate --starter` passes even after running the Python CLI creates `__pycache__` files inside the starter. This is reasonable for an installed copied repo, but it is risky for a clean payload development repo unless a separate export/clean verification exists.
- The CLI help is too weak for real users. Top-level `--help` lists no subcommands or command-specific examples, so the starter relies on sparse docs instead of discoverable operation.
- The skill catalog and validator catalog cite many `tests.contract.*` validation commands, but those tests are not present inside `starter/standard-harness/`. As shipped, these references are trace links or development-history expectations, not executable validation in a copied repo.
- The runtime is already large for an unproven product payload: about 15.5k lines of Python under `_harness/system/standard_harness`. Until each module is classified as `core starter kernel`, `optional profile`, `development-only/reference`, or `remove/defer`, this should be treated as possible v1 baggage, not as merely future-justified product surface.
- Product and ops folders are seed-only. That is correct for a clean starter, but the first copied-repo workflow should prove the folders become useful through packet creation, evidence registration, closeout, wiki proposal, and context generation.
- `agent-permissions.yaml` includes a `harness-developer` role and a write zone of `starter/standard-harness/**`. Inside a copied starter repo this path is not the payload root, and the role itself may leak development-repository maintenance concerns into the product payload.
- Role coverage is incomplete. `role-routing.yaml` only covers developer, reviewer, and tester, while the v2 philosophy also depends on planner, documenter, wiki-applier, security reviewer, refactor reviewer, PM/orchestrator-style coordination, and human decision boundaries.

### Current Productization Verdict
v2.1 has the right architecture vocabulary and many useful components, but it has not yet proven the minimum real project lifecycle. It is closer to a large contract/runtime prototype than a ready clean starter product.

For v2.2, the target should not be "more features." The target should be "a copied repo can run one complete, evidence-backed, provider-neutral packet lifecycle without confusing root v1, legacy v2 documents, runtime-generated files, product documents, and starter-maintainer roles."

## Question 2: What Can Be Carried From v1 Without Harming v2?

### Carry As Patterns, Not Bulk Artifacts
- Deterministic validation discipline:
  - Keep root v1's habit of `validate`, `validation-report`, and test-backed gates.
  - Do not copy v1's broad command surface wholesale.
- Payload boundary checks:
  - Keep clean starter validation, contamination scans, and copied-starter smoke checks.
  - Strengthen them for v2's `_harness/_ops/product` boundary.
- Active context as generated summary:
  - Keep compact re-entry context and freshness checks.
  - In v2, place generated context under `_ops/active-context/` and keep it lower authority than policies, evidence, gates, and human decisions.
- Packet-before-code discipline:
  - Keep explicit packet scope, evidence requirements, test plan, review, closeout, and approval boundaries.
  - Do not carry large workflow Markdown files as product identity.
- Reviewer and challenge gates:
  - Keep independent challenge review and critical review patterns.
  - In v2, make them role/provider-neutral and evidence-scoped.
- Browser evidence pattern:
  - Keep the principle that web/UI work needs real browser verification or an explicit N/A decision.
  - Do not force browser tooling into non-web starter paths.
- Skill discovery and routing:
  - Keep automatic skill selection as a concept.
  - Rebuild as small v2-native skill contracts and router outputs, not Codex-specific skill docs as the product contract.
- Friction and compound learning:
  - Keep the loop from repeated friction to improvement candidate to human-approved harness packet.
  - Do not let the harness auto-mutate `_harness/**` without packet approval.
- Command taxonomy:
  - Keep a small, documented command taxonomy for starter users.
  - Avoid v1's very wide script surface becoming v2's default UX.

### Do Not Carry Directly
- Codex-specific `AGENTS.md` or provider-specific entry files into the starter.
- Root `.agents/**`, `.harness/**`, generated runtime state, release evidence, or prior packet history.
- Large legacy requirements/implementation plans as shipped starter docs.
- v1/v2.1 "tests.contract.*" references unless the tests are shipped, replaced by starter-native checks, or marked as development-only trace.
- Provider identity assumptions such as "Codex does X, Claude does Y" outside optional examples.
- A sprawling command surface where users cannot tell which commands are current, starter-safe, or implementation-only.

## v2.2 Direction Recommendation

### First Packet Should Remain Project Operating Folder Contract, But It Is Not Ready Yet
The recommended first packet is still correct. Folder/authority confusion is the core failure mode that caused prior work to land in the wrong place. If this is not settled first, later provider routing, wiki, skill, packet, and evidence work will keep drifting.

However, current `reference/packets/PKT-01_PROJECT_OPERATING_FOLDER_CONTRACT.md` is not yet sufficient for Ready For Code. It still needs the strengthened acceptance and evidence ledger items below, plus a completed Planner challenge review.

### But Its Acceptance Must Be Stronger
The first packet should not only update documents. It should prove:
- `starter/standard-harness/` remains copyable and contains no provider-specific entry contract.
- `_harness/`, `_ops/`, and `product/` are enforced from a single policy source.
- `init` creates missing `_ops/**` and `product/**` without mutating `_harness/**`.
- `_ops` reset behavior is executable or at least explicitly modeled as a safe command candidate.
- generated runtime files and Python caches are either not produced in clean payload checks or are removed/excluded by a dedicated export/clean step, with explicit proof that no `__pycache__` or `.pyc` remains.
- `agent-permissions.yaml` does not contain development-repo paths such as `starter/standard-harness/**`, and does not ship root-maintainer roles unless they are explicitly starter-native and packet-gated.
- `product/docs` document categories are validated at folder level, while file names remain samples only.
- wiki-ready output rules are stated without allowing direct documenter writes to `_ops/wiki/**`.
- subcommand help or `START_HERE.md` gives a user enough to complete the full first packet path: create packet, approve/scope, register requirement/acceptance/evidence/claim/gate, close out, generate context, and validate.
- shipped catalog references to validation commands are either runnable in the copied starter or explicitly marked development-only trace and not used as product proof.
- role authority and provider route are separated so v2 does not import v1-style workflow bloat by expanding provider routing too early.

### Proposed v2.2 Slice
1. Folder contract enforcement and cleanup:
   - align `project-operating-folders.yaml`, contamination checker, and initializer;
   - remove development-repo path leakage from starter policies;
   - add explicit clean-export or cache-safe validation guidance.
2. Copied starter smoke path:
   - copy starter to a temporary directory;
   - run init;
   - create a low-risk packet;
   - register evidence/gate/closeout;
   - generate context;
   - validate starter and packet state.
3. Starter-native proof set:
   - either ship minimal tests/self-checks or remove/mark non-shipped `tests.contract.*` validation commands as development-only trace;
   - ensure starter validation proves actual behavior rather than file presence only.
4. Starter kernel classification:
   - classify every major `_harness/system/standard_harness` module as `core starter kernel`, `optional profile`, `development-only/reference`, or `remove/defer`;
   - prevent modules unused by the first copied-repo lifecycle from becoming assumed product obligations.

## Findings For Reviewer Attention

### Finding 1: Validation Pass Does Not Equal Clean Payload
- Severity: high / v2.2 blocker
- Evidence: running `validate --starter` from the starter passes but creates `__pycache__` under `_harness/system/standard_harness/**`.
- Risk: a developer can believe the starter is clean after validation while the working tree contains generated cache files.
- Required v2.2 correction: add clean export/cleanup verification or run Python with a cache-safe mode in payload validation scripts.

### Finding 2: Product Payload Contains Development-Repo Role And Path Leakage
- Severity: high / v2.2 blocker
- Evidence: `_harness/policies/agent-permissions.yaml` contains `harness-developer` and `starter/standard-harness/**` under `harness-developer.allowedWriteZones`.
- Risk: copied starter users receive both a path and a maintenance role that may only make sense in this development repository.
- Required v2.2 correction: decide whether a starter-native harness-maintainer role exists. If not, move this rule to root v1 development governance. If yes, make it packet-gated and copied-root-native.

### Finding 3: Cataloged Validation Commands Reference Non-Shipped Tests
- Severity: high
- Evidence: `_harness/catalog/skill-catalog.yaml`, `_harness/policies/validator-catalog.yaml`, and trace contracts reference `tests.contract.*`, while the starter payload has no such test tree.
- Risk: traceability appears stronger than executable validation in a new repo.
- Required v2.2 correction: ship minimal starter self-tests, change references to development-only trace, or expose a runnable validation mode.

### Finding 4: Role Routing And Authority Are Not Yet Cleanly Separated
- Severity: medium
- Evidence: `role-routing.yaml` covers developer/reviewer/tester only; `agent-permissions.yaml` covers more roles.
- Risk: documenter/wiki-applier/planner/human-decision flows are core philosophy, but immediately expanding provider routing could import v1-style workflow bloat.
- Required v2.2 correction: define minimum authority records and handoff boundaries first; expand provider routing only where the first copied-repo lifecycle needs it.

### Finding 5: Starter UX Is Not Yet Self-Explanatory
- Severity: medium
- Evidence: top-level CLI help does not list subcommands or subcommand examples; `START_HERE.md` is intentionally short.
- Risk: a user copying the starter tomorrow can initialize it but may not know how to complete an evidence-backed packet.
- Required v2.2 correction: add discoverable command help or a short first-packet runbook that remains provider-neutral and product-clean.

### Finding 6: Current PKT-01 Is The Right Candidate But Not Sufficient
- Severity: blocking for Ready For Code
- Evidence: `reference/packets/PKT-01_PROJECT_OPERATING_FOLDER_CONTRACT.md` still needs updated acceptance for clean export/cache, copied-starter smoke, non-shipped test disposition, role authority, and full first-packet UX.
- Risk: approving PKT-01 as-is would let implementation patch documents without proving the actual v2.2 operating loop.
- Required v2.2 correction: revise PKT-01 and rerun Planner challenge review before asking for Ready For Code.

## Main-Agent Proposed Decision For v2.2
Upgrade v2.1 to v2.2 by proving a single clean, copied-repo operating loop before expanding any advanced module.

The first implementation wave should be:
- Project Operating Folder Contract hardening;
- starter cache/contamination/export proof;
- first-packet copied-repo smoke scenario;
- pruning or relabeling development-only references from the product payload;
- starter kernel/module classification before accepting the current runtime size as product surface.

## Subagent Review A: Challenge Reviewer
- Verdict: report direction is broadly supported, but it is not sufficient for v2.2 approval or Ready For Code.
- Blocking finding: PKT-01 is the right first candidate but is not yet sufficient; acceptance and evidence must be strengthened and Planner challenge review completed.
- High findings:
  - current validation pass does not prove clean payload because Python cache generation can be tolerated in installed mode;
  - `harness-developer` and `starter/standard-harness/**` are product-policy leakage from the development repo;
  - non-shipped `tests.contract.*` references are product proof problems, not only traceability issues.
- Medium findings:
  - `START_HERE.md` and `_harness/README.md` do not guide a complete evidence-backed lifecycle;
  - command outputs need a reviewable evidence ledger rather than unpersisted assistant claims.
- Disposition: accepted. The report now links `reference/reports/v2-current-analysis-evidence-ledger.md`, raises the affected findings, and states PKT-01 must be revised before Ready For Code.

## Subagent Review B: Critical Reviewer
- Verdict: revise before approval.
- High findings:
  - clean validation is too weak and risks validation theatre;
  - current runtime scale should be treated as possible baggage until kernel/optional/dev-only/remove classification exists;
  - `harness-developer` role itself, not only the path, may be inappropriate in the shipped product policy.
- Medium findings:
  - non-runnable `tests.contract.*` references weaken evidence-first philosophy;
  - role authority must be separated from provider routing to avoid v1-style workflow bloat;
  - Codex/Claude examples are acceptable only if clearly non-authoritative.
- Safe v1 carry-over:
  - packet-before-code, low-authority generated active context, deterministic copied-starter validation, contamination scanning, independent challenge review, evidence-first closeout, explicit human decisions.
- Must reject:
  - provider-specific entry contracts in starter, root `.agents/.harness` state, packet history, non-runnable test references as product proof, large v1-style workflow/skill Markdown, broad command/runtime surface before lifecycle proof, root-maintainer roles in starter.
- Disposition: accepted. The report now treats runtime scale, clean validation, and starter-shipped maintainer roles as v2.2 blockers or required classification items.

## Integrated Disposition
- The analysis supports this conclusion: v2 is philosophically pointed in the right direction, but current v2.1 should not be treated as productized.
- The first packet should remain Project Operating Folder Contract, but PKT-01 must be revised before Ready For Code.
- v2.2 should not import more v1 material. It should prove a minimal copied-repo lifecycle, clean payload export, starter-native validation, and clear separation between authority roles and provider routing.
- Next recommended route: Planner revises PKT-01 acceptance and challenge ledger; only after that should Developer implement v2.2 folder-contract hardening.
