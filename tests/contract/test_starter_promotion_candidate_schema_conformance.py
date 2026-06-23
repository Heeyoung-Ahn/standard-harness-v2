import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StarterPromotionCandidateSchemaConformanceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_schema_requires_evidence_linked_promotion_fields(self):
        schema = json.loads((ROOT / "_harness/schemas/starter-promotion-candidate.schema.json").read_text())

        required = set(schema["required"])

        self.assertTrue(
            {
                "candidateId",
                "sourceXp",
                "source",
                "proposedChange",
                "expectedBenefit",
                "risk",
                "requiresHarnessPacket",
                "promotionStatus",
                "evidenceIds",
            }.issubset(required)
        )

    def test_registry_accepts_schema_conformant_candidate(self):
        from standard_harness.self_improvement.starter_promotion import StarterPromotionCandidateRegistry

        result = StarterPromotionCandidateRegistry().register(
            {
                "candidateId": "SP-001",
                "sourceXp": "XP-09A",
                "source": {"type": "friction", "id": "FR-001"},
                "proposedChange": "Add starter-safe command inventory hint.",
                "expectedBenefit": "Reduce repeated manual command lookup.",
                "risk": "low",
                "requiresHarnessPacket": True,
                "promotionStatus": "proposed",
                "evidenceIds": ["ev-001"],
            }
        )

        self.assertEqual("registered", result["status"])
        self.assertEqual([], result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
