import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class HumanDecisionNonOverridableItemsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_human_decision_schema_declares_required_fields(self):
        schema = json.loads(
            (ROOT / "_harness" / "schemas" / "human-decision.schema.json").read_text(
                encoding="utf-8"
            )
        )

        for field in [
            "decisionId",
            "packetId",
            "gate",
            "decisionType",
            "rationale",
            "acceptedRisk",
            "approver",
            "expiresAt",
            "followUpPacketRequired",
            "followUpPacketId",
        ]:
            self.assertIn(field, schema["required"])

    def test_non_overridable_item_is_rejected_even_with_human_approval(self):
        from standard_harness.validation.human_decision import HumanDecisionValidator

        decision = _decision(overrides=["missing_packet"])

        result = HumanDecisionValidator.load(ROOT).validate(decision)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("non_overridable_override", result["diagnostic_ids"])
        self.assertIn("missing_packet", result["nonOverridableItems"])

    def test_overridable_risk_acceptance_requires_follow_up_when_flagged(self):
        from standard_harness.validation.human_decision import HumanDecisionValidator

        decision = _decision(
            overrides=["residual_security_risk"],
            follow_up_packet_required=True,
            follow_up_packet_id="",
        )

        result = HumanDecisionValidator.load(ROOT).validate(decision)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_follow_up_packet", result["diagnostic_ids"])


def _decision(
    *,
    overrides: list[str],
    follow_up_packet_required: bool = False,
    follow_up_packet_id: str = "PKT-FOLLOW-UP",
) -> dict[str, object]:
    return {
        "decisionId": "DEC-2026-0001",
        "packetId": "PKT-EXAMPLE-01",
        "gate": "security-review-gate",
        "decisionType": "risk-acceptance",
        "rationale": "Accept limited residual risk.",
        "acceptedRisk": "Residual operational risk.",
        "approver": "human-owner",
        "expiresAt": "2026-12-31",
        "followUpPacketRequired": follow_up_packet_required,
        "followUpPacketId": follow_up_packet_id,
        "requestedOverrides": overrides,
    }


if __name__ == "__main__":
    unittest.main()
