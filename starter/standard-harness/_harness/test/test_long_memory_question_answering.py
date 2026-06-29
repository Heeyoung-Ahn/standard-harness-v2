from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.memory.question_answering import (  # noqa: E402
    REQUIRED_MEMORY_CATEGORIES,
    LongMemoryQuestionAnsweringService,
    LongMemorySourceDiscovery,
    LongMemorySourceIndexBuilder,
)


BASE_SOURCES = [
    {
        "source_type": "packet",
        "category": "packet_history",
        "path": "reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md",
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": "PKT-05 opened the long-memory question-answering lane.",
        "evidence_refs": ["_ops/evidence/PKT-05/evidence-index.json"],
    },
    {
        "source_type": "decision",
        "category": "architecture_decision",
        "path": ".agents/artifacts/ARCHITECTURE_GUIDE.md#long-memory-and-question-answering",
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": "Question answers must be read models over canonical sources.",
        "evidence_refs": ["reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md"],
    },
    {
        "source_type": "requirement",
        "category": "project_intent",
        "path": ".agents/artifacts/REQUIREMENTS.md#SHV2-REQ-042",
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": "Long memory preserves compact evidence-backed project knowledge.",
        "evidence_refs": ["reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md"],
    },
    {
        "source_type": "wiki",
        "category": "current_convention",
        "path": "_ops/wiki/current-conventions.md",
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": "Generated views are read models, not authority.",
        "evidence_refs": ["reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md"],
    },
    {
        "source_type": "pmo",
        "category": "known_friction",
        "path": "product/docs/pmo/day-wrap-up/2026-06-28.md",
        "authority_tier": "coordination",
        "freshness_status": "fresh",
        "summary": "PM summaries coordinate next work without approval authority.",
        "evidence_refs": ["_ops/evidence/PKT-04/evidence-index.json"],
    },
    {
        "source_type": "risk",
        "category": "open_risk",
        "path": ".agents/artifacts/VALIDATION_REPORT.md",
        "authority_tier": "canonical",
        "freshness_status": "fresh",
        "summary": "No open blockers; high-risk packet still requires closeout evidence.",
        "evidence_refs": ["reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md"],
    },
    {
        "source_type": "decision",
        "category": "deprecated_context",
        "path": "reference/legacy/current-root-v2-docs/README.md",
        "authority_tier": "reference",
        "freshness_status": "fresh",
        "summary": "Legacy root docs are reference material, not default context.",
        "evidence_refs": ["AGENTS.md"],
    },
]


class LongMemoryQuestionAnsweringTests(unittest.TestCase):
    def test_source_discovery_reads_real_ops_wiki_pmo_decision_and_context_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(
                repo_root / "_ops/packets/PKT-05.md",
                "# PKT-05\nPacket history says source discovery was remediated.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n",
            )
            self._write(
                repo_root / "_ops/evidence/PKT-05/evidence-index.json",
                """
                {
                  "entries": [
                    {
                      "evidenceId": "EV-05",
                      "evidenceType": "unit-test",
                      "sourcePath": "_ops/evidence/PKT-05/green.txt",
                      "status": "pass",
                      "trustStatus": "trusted",
                      "freshnessStatus": "fresh",
                      "resolutionStatus": "resolved",
                      "redactionStatus": "clean"
                    }
                  ]
                }
                """,
            )
            self._write(
                repo_root / "product/docs/packets/PKT-05-closeout.md",
                "# PKT-05 Closeout\nCloseout cites _ops/evidence/PKT-05/evidence-index.json.\n",
            )
            self._write(repo_root / "_ops/wiki/project-intent.md", "# Project Intent\nHuman planning intent drives packet acceptance.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/wiki/architecture-decisions.md", "# Architecture\nAnswers are read models.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/wiki/current-conventions.md", "# Conventions\nGenerated state is not authority.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/wiki/known-frictions.md", "# Frictions\nReview gaps must become blockers.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/wiki/deprecated-context.md", "# Deprecated Context\nLegacy root docs are reference only.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/wiki-proposals/PKT-05-memory.json", '{"summary": "Validated wiki proposal", "evidence": "_ops/evidence/PKT-05/evidence-index.json"}')
            self._write(repo_root / "product/docs/pmo/PKT-05-summary.md", "# PM Summary\nPM summary cites _ops/evidence/PKT-05/evidence-index.json.\n")
            self._write(repo_root / "_ops/risks/open-risk.md", "# Open Risk\nMissing evidence blocks confident answers.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/blockers/open-blocker.md", "# Open Blocker\nNo current blockers remain.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/decisions/DEC-01.md", "# Decision\nPacket document review is required before Ready For Code.\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(
                repo_root / "_ops/active-context/ACTIVE_CONTEXT.json",
                '{"nextWork": {"action": "Route remediation through Orchestrator."}, "evidence": "_ops/evidence/PKT-05/evidence-index.json", "validation": {"ok": true}}',
            )

            sources = LongMemorySourceDiscovery(repo_root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened and what should happen next?")

        self.assertEqual(answer["status"], "pass")
        for category in REQUIRED_MEMORY_CATEGORIES:
            self.assertIn(category, index["sourceCategories"])
        self.assertTrue(any(ref.endswith("evidence-index.json") for ref in answer["evidenceRefs"]))
        source_types = {source["sourceType"] for source in index["sources"]}
        self.assertIn("active_context", source_types)
        self.assertIn("wiki_proposal", source_types)
        self.assertIn("pmo", source_types)
        self.assertIn("blocker", source_types)
        next_answer = LongMemoryQuestionAnsweringService().answer(index, "What should happen next?")
        self.assertIn("active_context", {source["type"] for source in next_answer["sourceRefs"]})

    def test_discovery_does_not_fan_out_unrelated_evidence_refs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(
                repo_root / "_ops/evidence/PKT-05/evidence-index.json",
                """
                {
                  "entries": [
                    {
                      "evidenceId": "EV-unrelated",
                      "status": "pass",
                      "trustStatus": "trusted",
                      "freshnessStatus": "fresh",
                      "resolutionStatus": "resolved",
                      "redactionStatus": "clean"
                    }
                  ]
                }
                """,
            )
            self._write(repo_root / "_ops/packets/PKT-05.md", "# PKT-05\nUnsupported packet claim without a direct evidence link.\n")

            sources = LongMemorySourceDiscovery(repo_root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("missing_evidence_link", answer["diagnostic_ids"])

    def test_fake_evidence_refs_are_rejected_when_repo_root_is_known(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            sources = [
                {
                    "source_type": "packet",
                    "category": "packet_history",
                    "path": "_ops/packets/PKT-05.md",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Packet claims unsupported completion.",
                    "evidence_refs": ["_ops/evidence/fake/evidence-index.json"],
                },
                *BASE_SOURCES[1:],
            ]

            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("missing_evidence_link", answer["diagnostic_ids"])

    def test_source_index_covers_required_memory_categories_and_no_source_diagnostics(self) -> None:
        index = LongMemorySourceIndexBuilder().build(BASE_SOURCES[:-1])

        self.assertTrue(index["readModel"])
        self.assertEqual(index["authority"], "read-model")
        for category in REQUIRED_MEMORY_CATEGORIES:
            self.assertIn(category, index["requiredCategories"])
        self.assertIn("no_source:deprecated_context", index["diagnostic_ids"])

    def test_answer_result_shape_cites_authoritative_sources_and_evidence(self) -> None:
        index = LongMemorySourceIndexBuilder().build(BASE_SOURCES)
        answer = LongMemoryQuestionAnsweringService().answer(
            index,
            "What evidence supports what happened and what should happen next?",
            max_answer_chars=480,
        )

        self.assertEqual(answer["status"], "pass")
        self.assertTrue(answer["readModel"])
        self.assertLessEqual(len(answer["answer"]), 480)
        self.assertIn("next-boundary", answer["nextBoundary"])
        self.assertTrue(answer["sourceRefs"])
        self.assertTrue(answer["evidenceRefs"])
        self.assertEqual(
            sorted(answer),
            sorted(
                [
                    "answer",
                    "authorityBoundary",
                    "diagnostic_ids",
                    "evidenceRefs",
                    "freshnessStatus",
                    "nextBoundary",
                    "nextAction",
                    "omittedSourceDiagnostics",
                    "promotionDiagnostics",
                    "question",
                    "readModel",
                    "redactionDisposition",
                    "risk",
                    "schemaVersion",
                    "sourceRefs",
                    "status",
                    "tokenEstimate",
                    "whatHappened",
                    "why",
                ]
            ),
        )

    def test_generated_stale_or_sensitive_sources_fail_closed(self) -> None:
        index = LongMemorySourceIndexBuilder().build(
            [
                {
                    "source_type": "active_context",
                    "category": "packet_history",
                    "path": ".agents/runtime/ACTIVE_CONTEXT.md",
                    "authority_tier": "generated",
                    "freshness_status": "stale",
                    "summary": "Generated summary claims implementation is approved.",
                    "evidence_refs": [],
                },
                {
                    "source_type": "evidence",
                    "category": "project_intent",
                    "path": "_ops/evidence/PKT-05/secrets.env",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "password=should-not-leak",
                    "classification": "SECRET",
                    "evidence_refs": ["_ops/evidence/PKT-05/secrets.env"],
                },
            ]
        )
        answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertIn("stale_source", answer["diagnostic_ids"])
        self.assertIn("low_authority_source", answer["diagnostic_ids"])
        self.assertIn("omitted_sensitive_source", answer["diagnostic_ids"])
        self.assertEqual(answer["redactionDisposition"], "sensitive-sources-omitted")
        self.assertNotIn("password", answer["answer"])
        self.assertEqual(index["resetPolicy"]["resetCommandImplemented"], True)
        self.assertEqual(index["resetPolicy"]["evidenceRetentionBypassed"], False)

    def test_missing_evidence_links_fail_closed_for_status_risk_and_next_questions(self) -> None:
        index = LongMemorySourceIndexBuilder().build(
            [
                {
                    "source_type": "packet",
                    "category": "packet_history",
                    "path": "_ops/packets/PKT-05.md",
                    "authority_tier": "canonical",
                    "freshness_status": "fresh",
                    "summary": "Packet claims remediation is complete.",
                    "evidence_refs": [],
                },
                *BASE_SOURCES[1:],
            ]
        )

        for question in ["What happened?", "What remains risky?", "What should happen next?"]:
            answer = LongMemoryQuestionAnsweringService().answer(index, question)
            self.assertEqual(answer["status"], "blocked")
            self.assertIn("missing_evidence_link", answer["diagnostic_ids"])

    def test_sensitive_sources_are_omitted_from_answer_wiki_handoff_and_context_pack_targets(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._seed_evidence_policy(repo_root)
            self._write(
                repo_root / "_ops/evidence/PKT-05/evidence-index.json",
                """
                {
                  "entries": [
                    {
                      "evidenceId": "EV-secret",
                      "sourcePath": "_ops/evidence/PKT-05/secret.env",
                      "status": "pass",
                      "trustStatus": "trusted",
                      "freshnessStatus": "fresh",
                      "resolutionStatus": "resolved",
                      "redactionStatus": "clean"
                    }
                  ]
                }
                """,
            )
            self._write(repo_root / "_ops/packets/PKT-05.md", "# PKT-05\nEvidence: _ops/evidence/PKT-05/evidence-index.json\n")
            self._write(repo_root / "_ops/evidence/PKT-05/secret.env", "API_KEY=sk-test\npassword=hidden\n")

            sources = LongMemorySourceDiscovery(repo_root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(repo_root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(index, "What happened?")

        self.assertEqual(answer["status"], "blocked")
        self.assertEqual(answer["redactionDisposition"], "sensitive-sources-omitted")
        omitted_targets = {
            item["target"]
            for item in index["promotionDiagnostics"]
            if item["code"] in {"sensitive_wiki_promotion", "sensitive_context_pack_promotion", "secret_evidence_registered"}
        }
        self.assertTrue({"wiki", "handoff", "context_pack"}.issubset(omitted_targets))
        self.assertNotIn("password", answer["answer"])

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")

    def _seed_evidence_policy(self, repo_root: Path) -> None:
        self._write(
            repo_root / "_harness/policies/evidence-classification.yaml",
            """
            {
              "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
              "defaults": {"classification": "INTERNAL"},
              "promotionRules": {
                "PUBLIC": {"wikiPromotionAllowed": true, "handoffAllowed": true},
                "INTERNAL": {"wikiPromotionAllowed": true, "handoffAllowed": true},
                "SENSITIVE": {"wikiPromotionAllowed": false, "handoffAllowed": false},
                "SECRET": {"wikiPromotionAllowed": false, "handoffAllowed": false}
              },
              "registrationRules": {
                "SECRET": {"blocked": true, "diagnostic": "secret_evidence_registered"}
              }
            }
            """,
        )


if __name__ == "__main__":
    unittest.main()
