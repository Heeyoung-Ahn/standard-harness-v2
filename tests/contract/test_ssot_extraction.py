import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SsotExtractionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_markdown_requirements_extract_to_reviewable_registration_diff(self):
        from standard_harness.ssot.extractor import SsotExtractor

        source = (
            "# Requirements\n\n"
            "### REQ-A [Core]\n\n"
            "The system shall preserve evidence provenance.\n\n"
            "### REQ-B [Standard]\n\n"
            "The system should automate SSOT extraction.\n"
        )
        diff = SsotExtractor().extract_markdown(
            source_doc="requirements.md",
            content=source,
            source_snapshot="sha256:test",
        )

        self.assertEqual(diff["status"], "review_required")
        self.assertFalse(diff["promoted"])
        self.assertEqual([entry["requirement_id"] for entry in diff["entries"]], ["REQ-A", "REQ-B"])
        self.assertEqual(diff["entries"][0]["source_doc"], "requirements.md")
        self.assertEqual(diff["entries"][0]["source_range"]["start_line"], 3)
        self.assertEqual(diff["entries"][0]["source_range"]["end_line"], 5)
        self.assertEqual(diff["entries"][0]["parser_confidence"], "high")
        self.assertEqual(diff["entries"][0]["classification"], "Core")
        self.assertEqual(diff["entries"][0]["source_snapshot"], "sha256:test")

    def test_extraction_diff_must_be_promoted_by_event(self):
        from standard_harness.ssot.registration_diff import RequirementRegistrationDiffService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = RequirementRegistrationDiffService(store)
            record = service.record_diff(
                diff_id="rdiff-001",
                source_doc="requirements.md",
                entries=[{"requirement_id": "REQ-A", "source_doc": "requirements.md"}],
                idempotency_key="rdiff-001",
            )

            self.assertEqual(record["promotion_state"], "proposed")
            self.assertEqual(record["source_event_range"], "1-0")
            self.assertEqual(record["source_watermark"], 0)
            with store.connection() as conn:
                row = conn.execute(
                    "select * from requirement_registration_diffs where diff_id = ?",
                    ("rdiff-001",),
                ).fetchone()
                event = conn.execute(
                    "select event_type from events where event_seq = 1"
                ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(event["event_type"], "ssot.registration_diff_recorded")

    def test_registration_diff_lifecycle_records_review_decision(self):
        from standard_harness.ssot.registration_diff import RequirementRegistrationDiffService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = RequirementRegistrationDiffService(store)
            service.record_diff(
                diff_id="rdiff-001",
                source_doc="requirements.md",
                entries=[{"requirement_id": "REQ-A", "source_doc": "requirements.md"}],
                idempotency_key="rdiff-001",
            )

            updated = service.transition_diff(
                diff_id="rdiff-001",
                promotion_state="approved",
                decision_record_id="DR-SSOT-001",
                rationale="Human approved registration diff.",
                idempotency_key="rdiff-001-approved",
            )

            self.assertEqual(updated["promotion_state"], "approved")
            self.assertEqual(updated["decision_record_id"], "DR-SSOT-001")
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events order by event_seq desc limit 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "ssot.registration_diff_transitioned")

    def test_registration_diff_transition_replays_and_audits_decision(self):
        from standard_harness.ssot.registration_diff import RequirementRegistrationDiffService
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = RequirementRegistrationDiffService(store)
            service.record_diff(
                diff_id="rdiff-001",
                source_doc="requirements.md",
                entries=[{"requirement_id": "REQ-A", "source_doc": "requirements.md"}],
                idempotency_key="rdiff-001",
            )
            service.transition_diff(
                diff_id="rdiff-001",
                promotion_state="approved",
                decision_record_id="DR-SSOT-001",
                rationale="Human approved registration diff.",
                idempotency_key="rdiff-001-approved",
            )
            transition_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=transition_seq)
            with store.connection() as conn:
                conn.execute("delete from requirement_registration_diffs")
                conn.commit()

            report = StateReplayService(store).rebuild_materialized_state(through_event_seq=transition_seq)
            replayed = service.get_diff("rdiff-001")

            self.assertEqual(report["status"], "rebuilt")
            self.assertEqual(replayed["promotion_state"], "approved")
            self.assertEqual(replayed["decision_record_id"], "DR-SSOT-001")
            self.assertEqual(
                snapshot["requirement_registration_diffs"]["rdiff-001"]["decision_record_id"],
                "DR-SSOT-001",
            )
