---
doc_id: HUMAN_STARTER_PROMOTION
audience: human
authority: explanatory
language: en
llm_read_policy: never_auto_read
default_context: false
---
# Starter Promotion

This workflow is for a future product project that was created from `standard-harness`.
During real product work, the copied harness can improve, but the project directory will also contain product code, runtime state, packet records, evidence, reports, generated artifacts, planning documents, and possible local secrets.

Do not reuse the source product project directory as the next starter. Export a target clean starter candidate instead.

```powershell
npm run harness:promote-starter -- --to <new-clean-starter-path>
```

Use `--dry-run` first when you want to inspect the include, exclude, and review lanes without writing the target.

```powershell
npm run harness:promote-starter -- --dry-run --to <new-clean-starter-path>
```

Use `--verify` when the operator is ready to run the fresh starter verification commands in the exported candidate. This can run package installation and tests.

```powershell
npm run harness:promote-starter -- --to <new-clean-starter-path> --verify
```

Use `--force` only after reviewing an existing non-empty target clean starter candidate path. The command never cleans the source product project.

```powershell
npm run harness:promote-starter -- --to <new-clean-starter-path> --force
```

## Source And Target

The source product project is the working project where the harness was improved during product delivery.

The target clean starter candidate is a separate folder intended for the next project. It is recreated from reusable starter/harness surfaces only.

## Lanes

| Lane | Meaning |
|---|---|
| include | Reusable standard-harness starter files that can be copied into the target candidate. |
| exclude | Product code, runtime state, evidence, reports, generated output, logs, secrets, sessions, transcripts, or project-specific planning material. |
| review | Files that need special handling, such as `package.json` harness scripts, or paths not covered by the explicit boundary. |

Unresolved review lanes block any release-ready claim. Resolve, adjudicate, or explicitly keep
every review lane as non-release before using promotion evidence in a release or starter
promotion decision.

## Contamination Audit

The contamination audit checks the exported candidate for product code, runtime state, packet/evidence/report output, generated validation/context/report output, DB/cache/log files, credentials, local secrets, browser sessions, raw transcripts, project-specific docs, and missing export provenance.

`block` means the candidate must not be used as the next starter until regenerated or corrected.
`hold` means evidence such as export provenance is missing.
`pass` means the candidate passed the bounded starter contamination audit.

## Fresh Starter Verification

Fresh starter verification keeps reusable payload checks separate from initialized project checks.

Reusable payload checks:

```powershell
npm install
npm test
npm run harness:payload-boundary
npm run harness:validate
```

In a clean, not-yet-initialized starter, the pre-init `harness:validate` step is expected to report `starter_bootstrap_pending`. The promotion verifier treats that specific hold as proof that the candidate is still a clean starter, then checks full validation again after initialization.

Initialized project checks:

```powershell
npm run harness:init -- --non-interactive --project-name "Promoted Starter Smoke" --project-slug "promoted-starter-smoke" --user-goal "Verify promoted starter" --ops-goal "Verify harness promotion workflow" --approval-goal "Keep approval boundaries explicit" --profiles none
npm run harness:sync-state
npm run harness:validate
npm run harness:status
```

The `sync-state` step must run after `harness:init` before status is interpreted.

## Authority Boundary

The promotion report does not grant release, publish, approval, closeout, risk closure, product verification, or residual-risk acceptance.

Treat it as evidence for whether a clean starter candidate was exported, audited, and optionally fresh-verified.
