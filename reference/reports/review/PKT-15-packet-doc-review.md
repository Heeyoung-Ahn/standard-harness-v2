# PKT-15 Packet Document Review

- Work item: `PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL`
- Packet: `reference/packets/PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md`
- Reviewer: Ohm, independent explorer subagent `019f14d5-a024-7183-b122-6b9deeaf524a`
- Review type: independent `packet_doc_review`
- Authority: evidence only; not Ready For Code approval, implementation approval, closeout, release, residual-risk acceptance, or starter-promotion approval.

## Initial Findings

### Finding 1
- Severity: blocking
- Source ref: packet `Verification Manifest`
- Affected surface: Ready For Code sequencing and implementation-plan sufficiency
- Challenged claim: packet has concrete pre-RFC planning/transition commands.
- Weakness: the packet grouped read-only planning-open preflight with state-changing `harness:first-packet --apply` and `harness:transition --apply`, and described them as pre-RFC while also saying they require Ready For Code.
- Required correction: split command sequence into pre-RFC read-only planning-open preflight, independent reviews, explicit Human Ready For Code, then implementation-transition / first-packet / transition apply commands.
- Recommended route: Planner revision and re-review.

### Finding 2
- Severity: blocking
- Source ref: packet `PKT-15 Readiness Conditions` and `Call-Site Matrix`
- Affected surface: Call-Site Matrix implementability against current code
- Challenged claim: Call-Site Matrix names exact runtime/service source surfaces.
- Weakness: modules and `RuntimeFrictionCapture` methods exist, but the matrix did not bind rows to current class/method targets such as `ValidationService.validate_all`, `ReviewGovernanceValidator.validate_release`, `FinalCloseoutValidator.validate_release`, `ContextPackBuilder.build`, `HumanDecisionValidator.validate`, and `ChallengeGateValidator.evaluate`.
- Required correction: bind each row to current class/method target while allowing a Planner-approved replacement only if implementation discovers a better single hook.
- Recommended route: Planner revise matrix and rerun packet_doc_review.

### Finding 3
- Severity: medium
- Source ref: packet `Verification Manifest` and `Required Evidence Paths`
- Affected surface: evidence production templates
- Challenged claim: command templates and evidence paths are concrete enough.
- Weakness: evidence paths were listed, but command templates did not state how stdout/JSON output is captured into named evidence paths, especially promotion dry-run, copied-starter smoke, root validation, and regression reports.
- Required correction: add evidence-capture templates or state which agent report wraps each command output and where it records exit code, command, timestamp, and result.
- Recommended route: Planner revise verification manifest before Ready For Code.

## Packet Quality Verdict

Human/Planner intent, provider-neutral philosophy, root/starter boundary, and the four PKT-15 hardening concerns are mostly preserved in scope and acceptance. The packet is not Ready For Code until the sequencing, call-site matrix, and evidence-capture defects are corrected and re-reviewed.

## Revision Disposition

Planner corrected the packet by splitting pre-RFC read-only preview from state-changing
post-Ready-For-Code route commands, binding the Call-Site Matrix to current class/method
targets with a Planner-approved replacement rule, and adding evidence-capture rules for
command, working directory, exit code, timestamp, result, and named output paths.

## Final Re-Review

No findings after second pass.

Second-pass note: the final re-review checked only the two prior blocker targets against
the packet-local Call-Site Matrix and current source. The review row now names concrete
existing methods, and the closeout row correctly names `CloseoutReportDocumenter.validate_report`.
The Planner-approved replacement rule remains present.

## Final Disposition

Packet Document Review status: pass. This is packet-quality evidence only and does not
approve Ready For Code, implementation, closeout, release, residual risk, or starter
promotion.
