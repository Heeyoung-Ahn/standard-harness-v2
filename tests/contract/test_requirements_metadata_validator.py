import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"

XP00_HR_IDS = {
    "HR-001V",
    "HR-002",
    "HR-003",
    "HR-004",
    "HR-005",
    "HR-006",
    "HR-007",
    "HR-008",
    "HR-119R",
    "HR-130R",
    "HR-131R",
    "HR-190R",
}

REQUIRED_SKILLS = {
    "SKILL-TDD-IMPLEMENTATION",
    "SKILL-EVIDENCE-TRUST-VALIDATION",
    "SKILL-BOUNDARY-VALIDATION",
    "SKILL-CLOSEOUT-DOCUMENTER",
    "SKILL-WIKI-PROPOSAL-VALIDATION",
    "SKILL-CONTEXT-PACK-GENERATION",
    "SKILL-FRICTION-ANALYSIS",
}


def _v02_hr_ids() -> set[str]:
    text = (ROOT / "docs" / "requirements" / "Standard_Harness_통합_요구사항_v0.2.md").read_text(
        encoding="utf-8"
    )
    return set(re.findall(r"^### (HR-[0-9]{3}[A-Z]?)\.", text, flags=re.MULTILINE))


def _copy_metadata_tree(tmp: str) -> Path:
    tmp_root = Path(tmp)
    shutil.copytree(ROOT / "_harness", tmp_root / "_harness")
    return tmp_root


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


class RequirementsMetadataValidatorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_xp00_requirement_baseline_has_metadata_trace_coverage_policy_and_telemetry(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository
        from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator

        diagnostics = RequirementsMetadataValidator(ROOT).validate()

        self.assertEqual([], diagnostics)

        repository = RequirementsMetadataRepository(ROOT)
        index = repository.requirements_index()
        traceability = repository.traceability_matrix()
        coverage = repository.hr_coverage_matrix()
        p0_policy = repository.p0_policy()
        skills = repository.minimum_required_skills()
        friction_schema = repository.friction_signal_schema()
        metric_schema = repository.metric_signal_schema()

        self.assertEqual("0.2.0", index["baselineVersion"])
        self.assertEqual("XP-00", index["ownerXp"])
        self.assertTrue(XP00_HR_IDS.issubset({item["id"] for item in index["requirements"]}))
        for item in index["requirements"]:
            if item["id"] in XP00_HR_IDS:
                self.assertIn(item["priority"], {"P0-Always", "P0-Conditional", "P1", "Vision"})
                self.assertTrue(item["verification"]["validators"])

        trace_ids = {item["hrId"] for item in traceability["traceability"]}
        self.assertTrue(XP00_HR_IDS.issubset(trace_ids))
        for item in traceability["traceability"]:
            if item["hrId"] in XP00_HR_IDS:
                self.assertEqual("XP-00", item["xpOwner"])
                self.assertTrue(item["validators"] or item["policies"] or item["schemas"])
                self.assertTrue(item["tests"])

        coverage_by_id = {item["hrId"]: item for item in coverage["coverage"]}
        self.assertTrue(XP00_HR_IDS.issubset(coverage_by_id))
        self.assertEqual("canonical", coverage["artifactRole"])
        self.assertEqual("partial", coverage_by_id["HR-130R"]["coverageStatus"])
        self.assertEqual("create", coverage_by_id["HR-190R"]["implementationDisposition"])
        self.assertTrue(coverage_by_id["HR-190R"]["releaseBlocking"])

        self.assertTrue(p0_policy["p0Always"]["nonWaivable"])
        self.assertTrue(p0_policy["p0Conditional"]["nonWaivableWhenApplicable"])
        self.assertEqual("requirements-baseline-gate", p0_policy["xp00ReleaseBlocking"]["gateId"])

        skill_ids = {item["id"] for item in skills["skills"]}
        self.assertEqual(REQUIRED_SKILLS, skill_ids)
        self.assertEqual("XP-07", skills["frozenUntil"])

        self.assertEqual("friction.signal", friction_schema["properties"]["eventType"]["const"])
        self.assertIn("docs_drift", friction_schema["properties"]["signalType"]["enum"])
        self.assertEqual("metric.signal", metric_schema["properties"]["eventType"]["const"])
        self.assertIn("value", metric_schema["required"])

    def test_requirements_index_coverage_and_traceability_match_v02_hr_headings(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository

        repository = RequirementsMetadataRepository(ROOT)
        index_ids = {item["id"] for item in repository.requirements_index()["requirements"]}
        coverage_ids = [item["hrId"] for item in repository.hr_coverage_matrix()["coverage"]]
        traceability_ids = [item["hrId"] for item in repository.traceability_matrix()["traceability"]]
        v02_ids = _v02_hr_ids()

        self.assertEqual(v02_ids, index_ids)
        self.assertEqual(index_ids, set(coverage_ids))
        self.assertEqual(index_ids, set(traceability_ids))
        self.assertEqual(len(coverage_ids), len(set(coverage_ids)))
        self.assertEqual(len(traceability_ids), len(set(traceability_ids)))

    def test_requirement_source_paths_exist(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository

        repository = RequirementsMetadataRepository(ROOT)

        for item in repository.requirements_index()["requirements"]:
            with self.subTest(requirement=item["id"]):
                self.assertTrue((ROOT / item["source"]).exists(), item["source"])

    def test_xp00_release_blocking_diagnostics_are_consistent(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository

        repository = RequirementsMetadataRepository(ROOT)
        p0_diagnostics = set(repository.p0_policy()["xp00ReleaseBlocking"]["diagnosticIds"])
        coverage_validators = repository.hr_coverage_matrix()["releaseBlockingValidators"]
        coverage_diagnostics = {
            diagnostic
            for validator in coverage_validators
            if validator["validator"] == "requirements-metadata-validator"
            for diagnostic in validator["diagnosticIds"]
        }

        self.assertEqual(coverage_diagnostics, p0_diagnostics)

    def test_improvement_and_starter_promotion_seed_schemas_exist_and_are_traceable(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository

        repository = RequirementsMetadataRepository(ROOT)
        improvement_schema = repository.improvement_candidate_schema()
        starter_schema = repository.starter_promotion_candidate_seed_schema()
        traceability = repository.traceability_matrix()["traceability"]

        self.assertEqual("improvement.candidate", improvement_schema["properties"]["eventType"]["const"])
        self.assertEqual(
            "starter-promotion.candidate.seed",
            starter_schema["properties"]["eventType"]["const"],
        )
        hr119_trace = next(item for item in traceability if item["hrId"] == "HR-119R")
        self.assertIn("improvement-candidate.schema.json", hr119_trace["schemas"])
        self.assertIn("starter-promotion-candidate.seed.schema.json", hr119_trace["schemas"])

    def test_validator_fails_when_coverage_row_is_missing(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository
        from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator

        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = _copy_metadata_tree(tmp)
            repository = RequirementsMetadataRepository(tmp_root)
            coverage = repository.hr_coverage_matrix()
            coverage["coverage"] = [
                item for item in coverage["coverage"] if item["hrId"] != "HR-010R"
            ]
            _write_json(repository.path("requirements", "hr-coverage-matrix.yaml"), coverage)

            diagnostics = RequirementsMetadataValidator(tmp_root).validate()

        self.assertIn("missing_hr_coverage", {item["error_code"] for item in diagnostics})

    def test_validator_fails_when_traceability_row_is_missing(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository
        from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator

        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = _copy_metadata_tree(tmp)
            repository = RequirementsMetadataRepository(tmp_root)
            traceability = repository.traceability_matrix()
            traceability["traceability"] = [
                item for item in traceability["traceability"] if item["hrId"] != "HR-010R"
            ]
            _write_json(repository.path("requirements", "traceability-matrix.yaml"), traceability)

            diagnostics = RequirementsMetadataValidator(tmp_root).validate()

        self.assertIn("missing_traceability", {item["error_code"] for item in diagnostics})

    def test_validator_fails_when_hr_rows_are_duplicated(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository
        from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator

        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = _copy_metadata_tree(tmp)
            repository = RequirementsMetadataRepository(tmp_root)
            coverage = repository.hr_coverage_matrix()
            coverage["coverage"].append(dict(coverage["coverage"][0]))
            _write_json(repository.path("requirements", "hr-coverage-matrix.yaml"), coverage)

            diagnostics = RequirementsMetadataValidator(tmp_root).validate()

        self.assertIn("duplicate_hr_coverage", {item["error_code"] for item in diagnostics})

    def test_validate_command_runs_requirements_baseline_gate(self):
        result = subprocess.run(
            [
                sys.executable,
                str(CLI),
                "--json",
                "validate",
                "--requirements-metadata",
            ],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        payload = json.loads(result.stdout)
        self.assertEqual("ok", payload["status"])
        self.assertEqual([], payload["diagnostics"])


if __name__ == "__main__":
    unittest.main()
