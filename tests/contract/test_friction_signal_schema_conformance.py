import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class FrictionSignalSchemaConformanceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_friction_signal_from_record_matches_canonical_schema_fields(self):
        from standard_harness.self_improvement.recurring import friction_signal_from_record

        signal = friction_signal_from_record(
            {
                "friction_record_id": "FR-001",
                "source_xp": "XP-02",
                "packet_id": "PKT-001",
                "signal_type": "missing_evidence",
                "severity": "high",
                "observed_at_gate": "evidence-trust-gate",
                "evidence_ids": ["ev-001"],
                "preventable_by_harness": True,
                "candidate_fix_type": "validator",
                "remediation_target": "evidence-trust",
            }
        )

        self.assertEqual("friction.signal", signal["eventType"])
        self.assertEqual("XP-02", signal["sourceXp"])
        self.assertEqual("missing_evidence", signal["signalType"])
        self.assertEqual("evidence-trust-gate", signal["observedAtGate"])
        self.assertEqual("XP-02:evidence-trust-gate:missing_evidence", signal["dedupeKey"])
        self.assertEqual("validator", signal["candidateFixType"])
        self.assertEqual("evidence-trust", signal["remediationTarget"])
        self.assertNotIn("frictionType", signal)

    def test_schema_allows_xp09a_remediation_targets(self):
        import json

        schema = json.loads((ROOT / "_harness/schemas/friction-signal.schema.json").read_text())

        self.assertIn("remediationTarget", schema["required"])
        self.assertIn("skill", schema["properties"]["candidateFixType"]["enum"])
        self.assertIn("handoff", schema["properties"]["candidateFixType"]["enum"])
        self.assertIn("workflow", schema["properties"]["candidateFixType"]["enum"])


if __name__ == "__main__":
    unittest.main()
