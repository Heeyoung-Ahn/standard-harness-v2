from __future__ import annotations

import sys
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.policy.gate_profiles import GateProfilePolicy  # noqa: E402


class GateProfileEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.policy = GateProfilePolicy.load(STARTER_ROOT)

    def test_normal_maps_to_standard(self) -> None:
        self.assertEqual(self.policy.normalize_risk_level("normal"), "standard")
        self.assertEqual(self.policy.normalize_risk_level("medium"), "standard")

    def test_low_docs_only_remains_lightweight(self) -> None:
        resolved = self.policy.resolve_required_gates(packet_type="docs-only", risk_level="low")

        self.assertEqual(resolved["effectiveRisk"], "low")
        self.assertEqual(
            resolved["requiredGates"],
            ["schema", "boundary", "docs-command-if-command-changed", "closeout"],
        )

    def test_release_sensitive_escalates_without_becoming_base_risk(self) -> None:
        resolved = self.policy.resolve_required_gates(
            packet_type="product-feature",
            risk_level="normal",
            release_sensitive=True,
            browser_facing=True,
        )

        self.assertEqual(resolved["baseRisk"], "standard")
        self.assertEqual(resolved["effectiveRisk"], "critical")
        self.assertIn("release-grade-validation", resolved["requiredGates"])
        self.assertIn("rollback-or-backout-evidence", resolved["requiredGates"])
        self.assertIn("user-workflow-review", resolved["requiredGates"])

    def test_na_decision_rejects_contradictory_runtime_and_browser_claims(self) -> None:
        result = self.policy.validate_na_decision(
            packet_type="docs-only",
            gate="e2e-applicability",
            rule_id="docs-only-no-runtime-change",
            evidence=["EV-1"],
            substitute_checks=["docs-command-inventory", "requirements-metadata-validation"],
            changed_files=["_harness/system/standard_harness/runtime.py"],
            claims=["browser-workflow-claim"],
        )

        self.assertFalse(result["ok"])
        self.assertIn("na_contradicted_by:runtime-path-changed", result["diagnostics"])
        self.assertIn("na_contradicted_by:browser-workflow-claim", result["diagnostics"])

    def test_closeout_blocks_missing_or_untrusted_required_gates(self) -> None:
        diagnostics = self.policy.closeout_required_gate_diagnostics(
            required_gates=["schema", "security-hard-gate", "closeout"],
            gate_results=[
                {"gate": "schema", "status": "PASS", "trusted": True, "fresh": True},
                {"gate": "security-hard-gate", "status": "PASS", "trusted": False, "fresh": False},
            ],
        )

        codes = sorted(item["code"] for item in diagnostics)
        self.assertEqual(
            codes,
            sorted(["missing_required_gate", "required_gate_stale", "required_gate_untrusted"]),
        )


if __name__ == "__main__":
    unittest.main()
