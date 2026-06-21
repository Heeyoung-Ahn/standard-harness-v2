import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RuleBasedNaDecisionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_na_decision_schema_requires_rule_basis_and_substitutes(self):
        schema_path = ROOT / "_harness" / "schemas" / "na-decision.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))

        required = set(schema["required"])
        for field in [
            "packetId",
            "gate",
            "status",
            "allowedByRule",
            "rationale",
            "substituteChecks",
            "approvedBy",
            "cannotBeUsedWhen",
            "policyVersion",
            "gateProfileVersion",
        ]:
            self.assertIn(field, required)
        self.assertEqual(schema["properties"]["status"]["const"], "N/A_RECORDED")

    def test_free_form_na_without_allowed_rule_is_rejected(self):
        from standard_harness.validation.na_decisions import NaDecisionValidator

        validator = NaDecisionValidator.load(ROOT)
        decision = {
            "packetId": "pkt-docs",
            "packetType": "docs-only",
            "gate": "e2e-gate",
            "status": "N/A_RECORDED",
            "allowedByRule": [],
            "rationale": "Not needed.",
            "substituteChecks": ["docs lint"],
            "approvedBy": {"role": "orchestrator"},
            "cannotBeUsedWhen": [],
            "policyVersion": "0.2.0",
            "gateProfileVersion": "docs-only@1",
        }

        result = validator.validate(decision)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_na_decision", result["diagnostic_ids"])

    def test_docs_only_no_runtime_change_rule_allows_e2e_na(self):
        from standard_harness.validation.na_decisions import NaDecisionValidator

        validator = NaDecisionValidator.load(ROOT)
        decision = {
            "packetId": "pkt-docs",
            "packetType": "docs-only",
            "gate": "e2e-gate",
            "status": "N/A_RECORDED",
            "allowedByRule": ["docs-only-no-runtime-change"],
            "rationale": "Documentation template change has no runtime execution path.",
            "substituteChecks": ["docs-command-inventory", "requirements-metadata-validation"],
            "approvedBy": {"role": "orchestrator"},
            "cannotBeUsedWhen": ["runtime-path-changed", "browser-workflow-claim"],
            "policyVersion": "0.2.0",
            "gateProfileVersion": "docs-only@1",
        }

        result = validator.validate(decision)

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["diagnostic_ids"], [])
        self.assertEqual(result["frictionSignalBehavior"], "emit missing_e2e when blocked")
        self.assertEqual(result["metricSignalBehavior"], "emit na_decision_validated count")


if __name__ == "__main__":
    unittest.main()
