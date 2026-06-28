# Command Taxonomy

This document classifies every script in `package.json` exactly once. It is an operator map, not a deprecation list. A command's group explains when an operator should consider it first; it does not change command behavior or compatibility.

## Groups

### core starter lifecycle

Use these commands to initialize, validate, inspect, refresh, and hand off a standard-harness project.

| Script | Group | Operator use |
|---|---|---|
| `harness:context` | core starter lifecycle | Run the documented harness command surface. |
| `harness:doctor` | core starter lifecycle | Run the documented harness command surface. |
| `harness:explain` | core starter lifecycle | Run the documented harness command surface. |
| `harness:handoff` | core starter lifecycle | Run the documented harness command surface. |
| `harness:init` | core starter lifecycle | Initialize a copied starter into a project. |
| `harness:next` | core starter lifecycle | Run the documented harness command surface. |
| `harness:payload-boundary` | core starter lifecycle | Check clean reusable payload boundaries. |
| `harness:promote-starter` | core starter lifecycle | Export reusable harness improvements into a target clean starter candidate. |
| `harness:risk` | core starter lifecycle | Run the documented harness command surface. |
| `harness:status` | core starter lifecycle | Run the documented harness command surface. |
| `harness:sync-state` | core starter lifecycle | Run the documented harness command surface. |
| `harness:validate` | core starter lifecycle | Validate harness structure and state. |
| `harness:validation-report` | core starter lifecycle | Run the documented harness command surface. |

### Codex workflow

Use these commands for Codex-specific entry, role/workflow execution, packet flow, and deployment/cutover planning.

| Script | Group | Operator use |
|---|---|---|
| `harness:agent` | Codex workflow | Run the documented harness command surface. |
| `harness:brief` | Codex workflow | Run the documented harness command surface. |
| `harness:codex-ready` | Codex workflow | Check Codex readiness dashboard state. |
| `harness:codex-start` | Codex workflow | Run the documented harness command surface. |
| `harness:codex-task` | Codex workflow | Run the documented harness command surface. |
| `harness:cutover-preflight` | Codex workflow | Run the documented harness command surface. |
| `harness:cutover-report` | Codex workflow | Run the documented harness command surface. |
| `harness:first-packet` | Codex workflow | Run the documented harness command surface. |
| `harness:migration-apply` | Codex workflow | Run the documented harness command surface. |
| `harness:migration-preview` | Codex workflow | Run the documented harness command surface. |
| `harness:orchestrate` | Codex workflow | Run the documented harness command surface. |
| `harness:packet-preflight` | Codex workflow | Check packet readiness before implementation or closeout. |
| `harness:transition` | Codex workflow | Run the documented harness command surface. |

### evidence/review

Use these commands to collect evidence, reviewer context, review reports, and browser evidence.

| Script | Group | Operator use |
|---|---|---|
| `browser:evidence` | evidence/review | Run the documented harness command surface. |
| `browser:evidence:audit` | evidence/review | Run the documented harness command surface. |
| `browser:evidence:intake` | evidence/review | Run the documented harness command surface. |
| `browser:evidence:prompt` | evidence/review | Run the documented harness command surface. |
| `harness:browser-evidence` | evidence/review | Run the documented harness command surface. |
| `harness:evidence` | evidence/review | Run the documented harness command surface. |
| `harness:evidence-manifest` | evidence/review | Run the documented harness command surface. |
| `harness:reviewer-report` | evidence/review | Run the documented harness command surface. |
| `harness:reviewers` | evidence/review | Run the documented harness command surface. |

### security/risk gates

Use these commands when risk, dependency, secret, untrusted input, destructive command, or evidence gate concerns are present.

| Script | Group | Operator use |
|---|---|---|
| `harness:abstain` | security/risk gates | Run the documented harness command surface. |
| `harness:dependency-intake` | security/risk gates | Run the documented harness command surface. |
| `harness:evidence-quality` | security/risk gates | Run the documented harness command surface. |
| `harness:freeze` | security/risk gates | Run the documented harness command surface. |
| `harness:guard` | security/risk gates | Run the documented harness command surface. |
| `harness:lane` | security/risk gates | Run the documented harness command surface. |
| `harness:manual-route` | security/risk gates | Run the documented harness command surface. |
| `harness:npm-diagnostic` | security/risk gates | Run the documented harness command surface. |
| `harness:repro-check` | security/risk gates | Run the documented harness command surface. |
| `harness:review-queue` | security/risk gates | Run the documented harness command surface. |
| `harness:risk-gate` | security/risk gates | Run the documented harness command surface. |
| `harness:secret-scan` | security/risk gates | Run the documented harness command surface. |
| `harness:task-brief` | security/risk gates | Run the documented harness command surface. |
| `harness:untrusted-scan` | security/risk gates | Run the documented harness command surface. |

### learning/operator diagnostics

Use these commands for learning, friction, dashboard, context budget, and daily operator diagnostics.

| Script | Group | Operator use |
|---|---|---|
| `harness:adapter-manifest` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:ai-review-package` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:ai-review-runner` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:automation-candidates` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:context-brief` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:context-budget-policy` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:context-meter` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:context-prune` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:dashboard` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:day-start-brief` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:day-wrap-up-brief` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:directional-pilot` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:friction-report` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learn` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learn-export` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learn-prune` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learn-search` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learning` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:learning-staleness` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:operator-digest` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:packaging-readiness` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:plan-quality` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:recovery-rehearsal` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:refactor-audit` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:review-findings` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:review-scope` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:reviewer-profile` | learning/operator diagnostics | Run the documented harness command surface. |
| `harness:trace-matrix` | learning/operator diagnostics | Run the documented harness command surface. |

### compatibility namespaces

Use these commands when a historical namespace, schema, or compatibility behavior must be checked. These names are compatibility metadata and do not define the visible root or starter product identity.

| Script | Group | Operator use |
|---|---|---|
| `harness:p2` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v23` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v24` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v24-policy-audit` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v25` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v26` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v27` | compatibility namespaces | Run the documented harness command surface. |
| `harness:v28` | compatibility namespaces | Run the documented harness command surface. |

### maintenance/internal

Use these commands for test, docs inventory, generated skill docs, and adapter/plugin maintenance. They are not the everyday operator path.

| Script | Group | Operator use |
|---|---|---|
| `docs:commands:check` | maintenance/internal | Write docs command inventory output. |
| `harness:adapter-guard` | maintenance/internal | Run the documented harness command surface. |
| `harness:codex-plugin` | maintenance/internal | Run the documented harness command surface. |
| `harness:doc-policy` | maintenance/internal | Run the documented harness command surface. |
| `harness:docs-commands` | maintenance/internal | Audit documented command references. |
| `harness:packet-lean` | maintenance/internal | Run the documented harness command surface. |
| `harness:skills-check` | maintenance/internal | Run the documented harness command surface. |
| `harness:skills-generate` | maintenance/internal | Run the documented harness command surface. |
| `pretest` | maintenance/internal | Run pre-test environment and skill checks. |
| `test` | maintenance/internal | Run payload test suite. |
