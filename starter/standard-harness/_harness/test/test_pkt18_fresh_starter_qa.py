from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.memory.question_answering import (  # noqa: E402
    LongMemoryQuestionAnsweringService,
    LongMemorySourceDiscovery,
    LongMemorySourceIndexBuilder,
)


class Pkt18FreshStarterQaTests(unittest.TestCase):
    def test_fresh_qa_omits_inherited_root_hardening_memory_and_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(
                repo_root / "reference/packets/PKT-16_RELEASE_BASELINE_RECONCILIATION.md",
                "# PKT-16\nRoot hardening memory says Productization baseline is closed.\n",
            )
            self._write(
                repo_root / "reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md",
                "# PKT-17 Closeout\nRoot clean export closeout should not answer fresh copied-project QA.\n",
            )

            sources = LongMemorySourceDiscovery(repo_root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("inherited_root_source_omitted", answer["diagnostic_ids"])
        self.assertTrue(
            all("reference/packets/PKT-16" not in source["pathOrId"] for source in answer["sourceRefs"])
        )
        self.assertNotIn("Productization baseline is closed", answer["answer"])

    def test_copied_project_sources_win_over_newer_inherited_root_memory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            evidence = "_ops/evidence/PKT-NEW/evidence-index.json"
            self._write(
                repo_root / evidence,
                json.dumps(
                    {
                        "entries": [
                            {
                                "evidenceId": "EV-NEW",
                                "status": "pass",
                                "trustStatus": "trusted",
                                "freshnessStatus": "fresh",
                                "resolutionStatus": "resolved",
                                "redactionStatus": "clean",
                            }
                        ]
                    }
                ),
            )
            self._write(
                repo_root / "reference/reports/review/PKT-16-closeout-evidence-review.md",
                "# Newer Root Review\nNewer inherited root memory must lose to copied project sources.\n",
            )

            sources = LongMemorySourceDiscovery(repo_root).discover()
            sources.extend(
                [
                    {
                        "source_type": "packet",
                        "category": category,
                        "path": f"_ops/packets/{category}.md",
                        "authority_tier": "canonical",
                        "freshness_status": "fresh",
                        "summary": f"Copied project source for {category}.",
                        "evidence_refs": [evidence],
                        "classification": "INTERNAL",
                        "project_provenance": "copied-project",
                    }
                    for category in [
                        "project_intent",
                        "architecture_decision",
                        "current_convention",
                        "packet_history",
                        "known_friction",
                        "open_risk",
                        "deprecated_context",
                    ]
                ]
            )
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened next?")

        self.assertEqual(answer["status"], "pass")
        self.assertIn("inherited_root_source_omitted", answer["diagnostic_ids"])
        self.assertTrue(answer["sourceRefs"])
        self.assertTrue(all(source["projectProvenance"] == "copied-project" for source in answer["sourceRefs"]))
        self.assertNotIn("Newer inherited root memory", answer["answer"])

    def test_evidence_ref_outside_copied_project_is_rejected_unless_retained_validation_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            bad_ref = "reference/reports/closeout/PKT-17-evidence-index.json"
            good_ref = "reference/reports/validation/PKT-18-retained-evidence-index.json"
            self._write(
                repo_root / bad_ref,
                json.dumps({"entries": [{"status": "pass", "trustStatus": "trusted", "freshnessStatus": "fresh", "resolutionStatus": "resolved", "redactionStatus": "clean"}]}),
            )
            self._write(
                repo_root / good_ref,
                json.dumps({"entries": [{"status": "pass", "trustStatus": "trusted", "freshnessStatus": "fresh", "resolutionStatus": "resolved", "redactionStatus": "clean"}]}),
            )
            sources = [
                {
                    "source_type": "packet",
                    "category": "packet_history",
                    "path": "_ops/packets/PKT-18.md",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Copied project source cites retained validation evidence.",
                    "evidence_refs": [good_ref],
                    "classification": "INTERNAL",
                },
                {
                    "source_type": "packet",
                    "category": "project_intent",
                    "path": "_ops/packets/PKT-18-bad.md",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Copied project source cites root closeout evidence.",
                    "evidence_refs": [bad_ref],
                    "classification": "INTERNAL",
                },
            ]

            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)

        self.assertIn("invalid_evidence_ref", index["diagnostic_ids"])
        valid_refs = {ref for source in index["sources"] for ref in source["evidenceRefs"]}
        self.assertIn(good_ref, valid_refs)
        self.assertNotIn(bad_ref, valid_refs)

    def test_retained_validation_evidence_is_not_an_answer_source_by_itself(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            retained_ref = "reference/reports/validation/PKT-18-retained-evidence-index.json"
            self._write(
                repo_root / retained_ref,
                json.dumps(
                    {
                        "entries": [
                            {
                                "status": "pass",
                                "trustStatus": "trusted",
                                "freshnessStatus": "fresh",
                                "resolutionStatus": "resolved",
                                "redactionStatus": "clean",
                            }
                        ],
                        "memorySources": [
                            {
                                "sourceType": "evidence",
                                "category": "packet_history",
                                "summary": "Retained validation evidence must not become copied-project authority.",
                                "classification": "INTERNAL",
                            }
                        ],
                    }
                ),
            )

            sources = LongMemorySourceDiscovery(repo_root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("no_source:packet_history", answer["diagnostic_ids"])
        self.assertFalse(answer["sourceRefs"])
        self.assertNotIn("Retained validation evidence", answer["answer"])

    def test_evidence_ref_traversal_cannot_escape_allowed_namespaces(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(
                repo_root / "_ops/packets/traversal-evidence-index.json",
                json.dumps({"entries": [{"status": "pass", "trustStatus": "trusted", "freshnessStatus": "fresh", "resolutionStatus": "resolved", "redactionStatus": "clean"}]}),
            )
            self._write(
                repo_root / "reference/reports/closeout/traversal-evidence-index.json",
                json.dumps({"entries": [{"status": "pass", "trustStatus": "trusted", "freshnessStatus": "fresh", "resolutionStatus": "resolved", "redactionStatus": "clean"}]}),
            )
            sources = [
                {
                    "source_type": "packet",
                    "category": "packet_history",
                    "path": "_ops/packets/PKT-18.md",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Copied project source cites traversal refs.",
                    "evidence_refs": [
                        "_ops/evidence/../packets/traversal-evidence-index.json",
                        "reference/reports/validation/../closeout/traversal-evidence-index.json",
                    ],
                    "classification": "INTERNAL",
                }
            ]

            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)

        self.assertIn("invalid_evidence_ref", index["diagnostic_ids"])
        self.assertEqual(index["sources"][0]["evidenceRefs"], [])

    def test_pm_authority_claim_stale_active_context_and_sensitive_sources_are_not_answers(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            sources = [
                {
                    "source_type": "pmo",
                    "category": "known_friction",
                    "path": "_ops/pmo/status.md",
                    "authority_tier": "coordination",
                    "freshness_status": "fresh",
                    "summary": "PM summary says approve release and closeout now.",
                    "classification": "INTERNAL",
                },
                {
                    "source_type": "active_context",
                    "category": "packet_history",
                    "path": "_ops/active-context/ACTIVE_CONTEXT.md",
                    "authority_tier": "generated",
                    "freshness_status": "stale",
                    "summary": "Stale generated runtime summary should not shape QA.",
                    "classification": "INTERNAL",
                    "evidence_refs": ["_ops/evidence/PKT-OLD/evidence-index.json"],
                },
                {
                    "source_type": "evidence",
                    "category": "open_risk",
                    "path": "_ops/evidence/secret-token.txt",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Sensitive memory must be omitted.",
                    "classification": "SECRET",
                },
            ]

            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "Can you approve release and closeout?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("prompt_like_source_omitted", answer["diagnostic_ids"])
        self.assertIn("omitted_sensitive_source", answer["diagnostic_ids"])
        self.assertIn("stale_source", answer["diagnostic_ids"])
        self.assertIn("low_authority_source", answer["diagnostic_ids"])
        self.assertIn("approval_authority_refused", answer["diagnostic_ids"])
        self.assertFalse(answer["sourceRefs"])
        self.assertEqual(answer["redactionDisposition"], "sensitive-sources-omitted")
        self.assertNotIn("approve release", answer["answer"])

    def test_discovery_does_not_import_local_db_or_cache_as_fresh_memory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(repo_root / ".harness/operating_state.sqlite", "local db cache")
            self._write(repo_root / "_ops/cache/runtime.txt", "cached runtime memory")
            self._write(repo_root / "_ops/packets/PKT-LOCAL.md", "# Local packet\nFresh copied project source.\n")

            sources = LongMemorySourceDiscovery(repo_root).discover()

        discovered_paths = {source["path"] for source in sources}
        self.assertIn("_ops/packets/PKT-LOCAL.md", discovered_paths)
        self.assertNotIn(".harness/operating_state.sqlite", discovered_paths)
        self.assertNotIn("_ops/cache/runtime.txt", discovered_paths)

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")

    def _seed_evidence_policy(self, repo_root: Path) -> None:
        self._write(
            repo_root / "_harness/policies/evidence-classification.yaml",
            json.dumps(
                {
                    "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
                    "defaults": {"classification": "INTERNAL"},
                    "promotionRules": {
                        "PUBLIC": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "INTERNAL": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "SENSITIVE": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                        "SECRET": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                    },
                    "registrationRules": {
                        "SECRET": {"blocked": True, "diagnostic": "secret_evidence_registered"}
                    },
                }
            ),
        )


if __name__ == "__main__":
    unittest.main()
