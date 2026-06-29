# PKT-10 SHV2-REQ-016 Closure Matrix

- Packet: `PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION`
- Requirement: `SHV2-REQ-016` - friction signals and compound-engineering feedback must feed improvement and starter-promotion candidates.
- Scope boundary: PKT-10 stops at `approval-needed`; actual starter promotion, release, publish, rollout, and residual-risk acceptance remain out of scope.

| Requirement Surface | Implementation Evidence | Behavior Evidence | Status |
|---|---|---|---|
| Friction signal schema and seed types | `starter/standard-harness/_harness/system/standard_harness/self_improvement/friction.py`; `starter/standard-harness/_harness/schemas/friction-signal.schema.json` | Focused test `test_seed_types_and_minimum_runtime_capture_surfaces_are_enforced`; `test_friction_signal_output_matches_public_schema_required_shape` | closed |
| Runtime/service friction capture | `RuntimeFrictionCapture`; `MINIMUM_CAPTURE_SURFACES` | Focused test `test_runtime_capture_service_records_all_required_surfaces` covers validation failure, warning-only validation pass, review gap, PM/report friction, closeout mismatch, token overuse, and authority-boundary violation | closed |
| Durable friction registry | `StoredFrictionSignalRegistry`; CLI `compound-feedback` event-store path | Focused test `test_stored_registry_persists_and_replays_signals_for_recurring_detection`; CLI smoke records `friction_signal_recorded` and replays metrics | closed |
| Recurring friction grouping | `self_improvement/recurring.py` | Focused test `test_recurring_detector_groups_by_type_surface_key_and_evidence_pattern` | closed |
| Improvement proposal lifecycle | `self_improvement/proposals.py` | Focused test `test_proposal_lifecycle_and_wiki_candidate_preserve_boundaries` | closed |
| Wiki / long-memory candidate boundary | `create_wiki_memory_candidate`; direct apply blocker | Focused test blocks direct wiki apply and preserves evidence references | closed |
| Starter-promotion candidate lifecycle | `self_improvement/starter_promotion.py`; `starter-promotion-candidate.schema.json` | Focused test drives `candidate -> dry-run -> approval-needed`; missing manifest and missing dry-run block | closed |
| Promotion safety gates | structured gate validation in `validate_candidate` | Focused test requires trusted provenance and evidence refs for contamination, clean-export, copied-starter smoke, sensitive no-leak, root-history no-leak, generated-residue no-leak, and human approval boundary | closed |
| Sensitive/root/generated leakage prevention | manifest, changed-surface, dry-run, and gate field whitelists | Focused test blocks raw secrets, root paths, forged string gates, direct mutation, and `promoted` status | closed |
| Metrics remain non-authoritative | `CompoundFeedbackMetrics` | Focused test and CLI smoke show `authority=operational-evidence-only` and `canApprovePromotion=false` | closed |
| Clean copied-starter proof | bounded `C:\tmp` copied starter smoke | `starter-check --root C:\tmp\<copy>\standard-harness --clean-export` returned `status=ok`, `diagnostics=[]`, `validationMode=clean-export` | closed |

## Verification Evidence

- RED: `reference/reports/tdd/PKT-10-red.md`
- GREEN: `reference/reports/tdd/PKT-10-green.md`
- Developer report: `reference/reports/developer/PKT-10_DEVELOPER_REPORT.md`
- Tester report: `reference/reports/test/PKT-10_TESTER_REPORT.md`
- Security review: `reference/reports/security/PKT-10-security-review.json`

## Residual Boundary

PKT-10 does not promote starter changes. Any future promotion execution must open a separate approved packet or trusted promotion command path and must revalidate Human approval, contamination, clean copied-starter behavior, release intent, and rollback evidence.
