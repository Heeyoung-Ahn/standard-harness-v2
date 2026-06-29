# PKT-13 Negative Source Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Status: pass

## Negative Fixtures Covered
| Fixture | Verified By | Result |
| --- | --- | --- |
| Generated, stale, or low-authority sources claim status. | `test_generated_stale_or_sensitive_sources_fail_closed` | blocked with stale/low-authority diagnostics |
| Sensitive or secret evidence enters answer/wiki/handoff/context-pack targets. | `test_sensitive_sources_are_omitted_from_answer_wiki_handoff_and_context_pack_targets` | omitted; no secret body in answer |
| Missing evidence links support status/risk/next claims. | `test_missing_evidence_links_fail_closed_for_status_risk_and_next_questions` | blocked with `missing_evidence_link` |
| Fake `_ops/evidence/**` reference is cited. | `test_fake_evidence_refs_are_rejected_when_repo_root_is_known` | blocked |
| Clean starter has only seed placeholders. | CLI smoke | blocked with `no_source:*`, no placeholder source refs |
| Question asks for approval/closeout authority. | `test_operating_qa_cli_returns_human_owner_answer_contract_without_approval_authority` | `approval_authority_refused` |
| Prompt-like source text appears in wiki/PM/LLM-style source content. | `test_prompt_like_source_text_is_omitted_from_answers` | omitted with `prompt_like_source_omitted`; prompt text absent from answer sections |
| Evidence classification policy is missing during discovery. | `test_missing_classification_policy_fails_closed` | blocked with `classification_policy_unavailable` |
| Raw evidence body exists under `_ops/evidence/**`. | `test_discovery_skips_raw_evidence_bodies_before_answer_budgeting` | raw body is not discovered, summarized, or answer-eligible |
| Retained `reference/**` evidence-index exists but entries are failing, untrusted, stale, unresolved, or sensitive. | `test_untrusted_retained_reference_evidence_blocks_regenerated_answers` | blocked with `invalid_evidence_ref` and `missing_evidence_link` |
