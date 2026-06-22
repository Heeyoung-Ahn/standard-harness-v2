import json
import sys
import tempfile
import unittest
from pathlib import Path

from tests.contract.test_v21_conformance_blocks_missing_validator_catalog_entries import (
    ROOT,
    SRC,
    copy_release_subset,
)


class V21ConformanceRequiredHrTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_blocks_release_when_required_hr_is_partial(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            copy_release_subset(root)
            coverage_path = root / "_harness/requirements/hr-coverage-matrix.yaml"
            coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
            for row in coverage["coverage"]:
                if row["hrId"] == "HR-190R":
                    row["coverageStatus"] = "partial"
                    break
            coverage_path.write_text(json.dumps(coverage), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("incomplete_hr_coverage", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
