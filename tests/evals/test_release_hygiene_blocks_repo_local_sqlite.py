import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ReleaseHygieneTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_blocks_release_when_repo_local_sqlite_state_exists(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            state = root / ".harness/state/harness.sqlite3"
            state.parent.mkdir(parents=True)
            state.write_bytes(b"local sqlite state")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("repo_local_generated_state", result["diagnostic_ids"])


def _copy_release_subset(target: Path) -> None:
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
    shutil.copytree(ROOT / "docs/manual", target / "docs/manual")
    if (ROOT / "_ops/evidence/release").exists():
        shutil.copytree(ROOT / "_ops/evidence/release", target / "_ops/evidence/release")


if __name__ == "__main__":
    unittest.main()
