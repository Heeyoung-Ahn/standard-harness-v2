import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StarterPromotionCandidateRegistryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_candidate_requires_compound_evidence_link(self):
        from standard_harness.self_improvement.starter_promotion import StarterPromotionCandidateRegistry

        result = StarterPromotionCandidateRegistry().register(
            {
                "candidateId": "sp-001",
                "sourceImprovementId": "imp-001",
                "evidenceIds": ["ev-001"],
                "promotionRationale": "Recurring friction fix should seed starter.",
            }
        )

        self.assertEqual(result["status"], "registered")
        self.assertEqual(result["candidate"]["evidenceIds"], ["ev-001"])


if __name__ == "__main__":
    unittest.main()
