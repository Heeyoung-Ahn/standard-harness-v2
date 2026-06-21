import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ValidatorCatalogHR190CoverageTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_validator_catalog_covers_hr190_and_hr191_gate_metadata(self):
        from standard_harness.validation.catalog import ValidatorCatalog

        catalog = ValidatorCatalog.from_repo(ROOT)

        self.assertTrue(catalog.validators_for_hr("HR-190R"))
        self.assertTrue(catalog.gate_metadata_for_hr("HR-191"))


if __name__ == "__main__":
    unittest.main()
