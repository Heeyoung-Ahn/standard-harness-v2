import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RetentionPolicyTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_retention_policy_classifies_evidence_logs_projections_and_archived_reports(self):
        from standard_harness.retention.policies import RetentionPolicyService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            service = RetentionPolicyService(store)

            evidence = service.classify_artifact("evidence")
            log = service.classify_artifact("log")
            projection = service.classify_artifact("projection")
            archived = service.classify_artifact("archived_report")

            self.assertEqual(evidence["artifact_class"], "evidence")
            self.assertGreaterEqual(evidence["retention_minimum_days"], 365)
            self.assertEqual(log["archive_rule"], "rotate_then_archive")
            self.assertEqual(projection["regeneration_expectation"], "regenerable_from_events")
            self.assertTrue(archived["approval_required"])

    def test_retention_policy_records_all_required_fields(self):
        from standard_harness.retention.policies import RetentionPolicyService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            policy = RetentionPolicyService(store).register_policy(
                retention_policy_id="retention-custom",
                artifact_class="evidence",
                retention_minimum_days=730,
                purge_rule="manual_approval_required",
                archive_rule="immutable_archive",
                regeneration_expectation="not_regenerable",
                approval_required=True,
                idempotency_key="retention-custom",
            )

            self.assertEqual(policy["retention_policy_id"], "retention-custom")
            self.assertEqual(policy["purge_rule"], "manual_approval_required")
            self.assertEqual(policy["archive_rule"], "immutable_archive")
            self.assertEqual(policy["regeneration_expectation"], "not_regenerable")


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


if __name__ == "__main__":
    unittest.main()
