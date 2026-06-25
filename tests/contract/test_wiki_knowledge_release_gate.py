import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiKnowledgeReleaseGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_release_blocks_current_wiki_page_without_provenance(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            _write_wiki_page(
                root,
                "architecture.md",
                {
                    "entryType": "DECISION",
                    "sourceTier": "trusted-evidence",
                    "reviewStatus": "current",
                    "canonicalSources": ["_harness/policies/wiki-knowledge-policy.yaml"],
                },
                "Current architecture note.",
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_wiki_provenance", result["diagnostic_ids"])

    def test_release_blocks_current_wiki_page_without_canonical_sources(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            _write_wiki_page(
                root,
                "current-conventions.md",
                {
                    "entryType": "DECISION",
                    "sourceTier": "trusted-evidence",
                    "reviewStatus": "current",
                    "provenance": {
                        "packetId": "XP-05B",
                        "evidenceIds": ["ev-wiki-001"],
                        "sourceTier": "trusted-evidence",
                    },
                },
                "Current convention note.",
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_wiki_canonical_source", result["diagnostic_ids"])

    def test_release_blocks_seed_or_projection_page_marked_current(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            _write_wiki_page(
                root,
                "packet-history.md",
                {
                    "entryType": "DECISION",
                    "sourceTier": "projection",
                    "reviewStatus": "current",
                    "canonicalSources": ["_ops/evidence/release/v21-review-governance.json"],
                    "provenance": {
                        "packetId": "XP-05B",
                        "evidenceIds": ["ev-wiki-002"],
                        "sourceTier": "projection",
                    },
                },
                "Projected packet history.",
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("stale_wiki_reference", result["diagnostic_ids"])

    def test_release_blocks_wiki_authority_override_claim(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            _write_wiki_page(
                root,
                "decision-log.md",
                {
                    "entryType": "DECISION",
                    "sourceTier": "trusted-evidence",
                    "reviewStatus": "current",
                    "canonicalSources": ["_harness/requirements/traceability-matrix.yaml"],
                    "provenance": {
                        "packetId": "XP-05B",
                        "evidenceIds": ["ev-wiki-003"],
                        "sourceTier": "trusted-evidence",
                    },
                },
                "This Wiki page overrides _harness policies and release gate results.",
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("wiki_authority_override", result["diagnostic_ids"])

    def test_release_blocks_skill_facing_index_authority_grant(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            skill_index = root / "_ops/wiki/skill-facing-index.md"
            skill_index.parent.mkdir(parents=True, exist_ok=True)
            skill_index.write_text(
                "---\n"
                "entryType: DECISION\n"
                "sourceTier: projection\n"
                "reviewStatus: draft\n"
                "---\n"
                "selectedBy: skill-router\n"
                "This index can authorize skills and release gates.\n",
                encoding="utf-8",
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("skill_facing_index_authority_violation", result["diagnostic_ids"])

    def test_release_blocks_stale_wiki_index_projection(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            _write_wiki_page(
                root,
                "known-frictions.md",
                {
                    "entryType": "FRICTION",
                    "sourceTier": "projection",
                    "reviewStatus": "draft",
                },
                "Draft friction projection.",
            )
            index = {
                "projectionOnly": True,
                "pages": [
                    {
                        "path": "_ops/wiki/known-frictions.md",
                        "entryType": "FRICTION",
                        "sourceTier": "trusted-evidence",
                        "reviewStatus": "current",
                    }
                ],
            }
            index_path = root / "_ops/wiki/index.yaml"
            index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("invalid_wiki_index", result["diagnostic_ids"])


def _copy_release_subset(target: Path) -> None:
    paths = [
        "_harness/requirements/hr-coverage-matrix.yaml",
        "_harness/requirements/traceability-matrix.yaml",
        "_harness/policies/validator-catalog.yaml",
        "_harness/policies/final-closeout-policy.yaml",
        "_harness/policies/release-behavior-probes.yaml",
        "_harness/policies/wiki-knowledge-policy.yaml",
        "_harness/schemas/final-closeout-evidence.schema.json",
        "_ops/evidence/release/v21-final-closeout.json",
        "_ops/metrics/hr200-success-metrics.json",
        "_ops/evidence/release/v21-executable-release-gate.json",
        "_ops/evidence/release/v21-full-regression.json",
        "_ops/evidence/release/v21-review-governance.json",
        "src/standard_harness/completion/v21_conformance.py",
        "src/standard_harness/domain/closeout.py",
        "src/standard_harness/validation/catalog.py",
        "src/standard_harness/validation/executable_release.py",
        "src/standard_harness/validation/final_closeout.py",
        "src/standard_harness/validation/review_governance.py",
        "src/standard_harness/validation/wiki_knowledge.py",
        "_harness/requirements/hr-coverage-matrix.yaml",
        "_harness/requirements/traceability-matrix.yaml",
        "_harness/policies/validator-catalog.yaml",
        "_harness/policies/final-closeout-policy.yaml",
        "_harness/policies/release-behavior-probes.yaml",
        "_harness/policies/wiki-knowledge-policy.yaml",
        "_ops/wiki/index.yaml",
        "_harness/policies/review-governance.yaml",
        "_harness/schemas/review-governance-evidence.schema.json",
        "docs/reviews/v21",
        "tests",
        "docs/release/v21-conformance-report.md",
        "docs/release/release-packaging-hygiene-v21.md",
        "docs/release/final-product-docs-command-inventory-v1.md",
        "docs/manual/standard-harness-v21-development-scenario.md",
    ]
    for relative in paths:
        source = ROOT / relative
        destination = target / relative
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    _refresh_review_governance_hashes(target)


def _write_wiki_page(root: Path, name: str, metadata: dict, body: str) -> None:
    wiki_root = root / "_ops/wiki"
    wiki_root.mkdir(parents=True, exist_ok=True)
    lines = ["---"]
    for key, value in metadata.items():
        if isinstance(value, (dict, list)):
            rendered = json.dumps(value, sort_keys=True)
        else:
            rendered = str(value)
        lines.append(f"{key}: {rendered}")
    lines.extend(["---", body])
    (wiki_root / name).write_text("\n".join(lines), encoding="utf-8")


def _refresh_review_governance_hashes(root: Path) -> None:
    path = root / "_ops/evidence/release/v21-review-governance.json"
    evidence = json.loads(path.read_text(encoding="utf-8"))
    for review in evidence.get("reviews", []):
        for item in review.get("reviewedFiles", []):
            reviewed_file = root / item["path"]
            item["sha256"] = _file_hash(reviewed_file)
    path.write_text(json.dumps(evidence, indent=2, sort_keys=True), encoding="utf-8")


def _file_hash(path: Path) -> str:
    import hashlib

    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


if __name__ == "__main__":
    unittest.main()
