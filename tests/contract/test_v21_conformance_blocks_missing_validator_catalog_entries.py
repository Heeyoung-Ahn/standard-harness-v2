import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


def copy_release_subset(target: Path) -> None:
    for relative in [
        "_harness/requirements/hr-coverage-matrix.yaml",
        "_harness/requirements/traceability-matrix.yaml",
        "_harness/policies/validator-catalog.yaml",
        "_ops/metrics/hr200-success-metrics.json",
    ]:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, destination)
    shutil.copytree(ROOT / "docs/reviews/v21", target / "docs/reviews/v21")
    shutil.copytree(ROOT / "docs/release", target / "docs/release")


class V21ConformanceValidatorCatalogTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_blocks_release_when_validator_catalog_entry_is_missing(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            copy_release_subset(root)
            catalog_path = root / "_harness/policies/validator-catalog.yaml"
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            catalog["validators"] = [
                item
                for item in catalog["validators"]
                if item["validatorId"] != "requirements-metadata-validator"
            ]
            catalog_path.write_text(json.dumps(catalog), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_validator_catalog_entry", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
