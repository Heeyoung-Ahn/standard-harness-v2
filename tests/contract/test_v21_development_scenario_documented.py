import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class V21DevelopmentScenarioDocumentationTests(unittest.TestCase):
    def test_development_scenario_covers_required_journey(self):
        path = ROOT / "docs/manual/standard-harness-v21-development-scenario.md"
        text = path.read_text(encoding="utf-8")

        for expected in [
            "product-feature packet",
            "test-first",
            "trusted evidence",
            "E2E",
            "security",
            "refactor",
            "wiki proposal",
            "handoff",
            "friction signal",
            "metric signal",
            "validate --all",
            "validate --v21-conformance",
            "validate --release",
        ]:
            self.assertIn(expected, text)


if __name__ == "__main__":
    unittest.main()
