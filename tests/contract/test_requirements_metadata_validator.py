import json
import subprocess
import sys
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
