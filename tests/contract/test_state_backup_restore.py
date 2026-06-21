import sys
import tempfile
import unittest
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StateBackupRestoreTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_backup_restore_preserves_event_order_projection_checksum_and_schema_metadata(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.compatibility import CompatibilityPolicy
        from standard_harness.state.migrations import schema_version
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            PacketService(source).create_packet(
                packet_id="pkt-001",
                title="Backup packet",
                objective="Preserve backup ordering and projection metadata.",
                risk_class="low",
                scope_summary="Backup and restore.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-verified"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            projection = CurrentContextProjection(source).generate(packet_id="pkt-001")
            backup_path = Path(source_tmp) / "state-backup.json"

            backup_report = StateBackupService(source).create_backup(backup_path)

            self.assertEqual(backup_report["schema_version"], schema_version())
            self.assertEqual(backup_report["event_seq_order"], [1, 2])
            self.assertEqual(backup_report["projection_checksum"], projection["dependency_digest"])
            self.assertEqual(
                CompatibilityPolicy(schema_version()).check_schema(backup_report["schema_version"])[
                    "status"
                ],
                "compatible",
            )

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            restore_report = StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(restore_report["restore_status"], "verified")
            self.assertEqual(restore_report["restored_event_seq_order"], [1, 2])
            self.assertEqual(restore_report["projection_checksum"], backup_report["projection_checksum"])
            self.assertEqual(PacketService(target).get_packet("pkt-001")["packet_id"], "pkt-001")
            with target.connection() as conn:
                restore_events = [
                    row["event_type"]
                    for row in conn.execute(
                        "select event_type from events where event_type = 'restore_verified'"
                    ).fetchall()
                ]
            self.assertEqual(restore_events, ["restore_verified"])

    def test_restore_rejects_tampered_backup_without_partial_event_log(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            PacketService(source).create_packet(
                packet_id="pkt-001",
                title="Tamper backup packet",
                objective="Reject tampered backup.",
                risk_class="low",
                scope_summary="Backup integrity.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-rejected"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            backup_path = Path(source_tmp) / "state-backup.json"
            StateBackupService(source).create_backup(backup_path)
            data = json.loads(backup_path.read_text(encoding="utf-8"))
            data["backup_checksum"] = "0" * 64
            backup_path.write_text(json.dumps(data, sort_keys=True, indent=2), encoding="utf-8")

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            with self.assertRaises(ValueError):
                StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(target.latest_event_seq(), 0)

    def test_restore_rejects_out_of_order_or_tampered_event_hash_without_partial_event_log(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.events import canonical_json, sha256_text
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            packets = PacketService(source)
            packets.create_packet(
                packet_id="pkt-001",
                title="Ordering backup packet",
                objective="Reject invalid event ordering.",
                risk_class="low",
                scope_summary="Backup integrity.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-rejected"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="approved packet work",
                idempotency_key="transition-pkt-001-progress",
            )
            backup_path = Path(source_tmp) / "state-backup.json"
            StateBackupService(source).create_backup(backup_path)
            data = json.loads(backup_path.read_text(encoding="utf-8"))
            data["events"][0]["payload_hash"] = "0" * 64
            data["backup_checksum"] = sha256_text(canonical_json({k: v for k, v in data.items() if k != "backup_checksum"}))
            backup_path.write_text(json.dumps(data, sort_keys=True, indent=2), encoding="utf-8")

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            with self.assertRaises(ValueError):
                StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(target.latest_event_seq(), 0)

    def test_restore_rejects_event_order_metadata_mismatch_without_partial_event_log(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.events import canonical_json, sha256_text
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            packets = PacketService(source)
            packets.create_packet(
                packet_id="pkt-001",
                title="Ordering metadata backup packet",
                objective="Reject mismatched event order metadata.",
                risk_class="low",
                scope_summary="Backup integrity.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-rejected"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="approved packet work",
                idempotency_key="transition-pkt-001-progress",
            )
            backup_path = Path(source_tmp) / "state-backup.json"
            StateBackupService(source).create_backup(backup_path)
            data = json.loads(backup_path.read_text(encoding="utf-8"))
            data["event_seq_order"] = list(reversed(data["event_seq_order"]))
            data["backup_checksum"] = sha256_text(
                canonical_json({k: v for k, v in data.items() if k != "backup_checksum"})
            )
            backup_path.write_text(json.dumps(data, sort_keys=True, indent=2), encoding="utf-8")

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            with self.assertRaises(ValueError):
                StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(target.latest_event_seq(), 0)

    def test_restore_rejects_non_contiguous_event_sequence_without_partial_event_log(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.events import canonical_json, sha256_text
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            packets = PacketService(source)
            packets.create_packet(
                packet_id="pkt-001",
                title="Contiguous sequence backup packet",
                objective="Reject event sequence gaps.",
                risk_class="low",
                scope_summary="Backup integrity.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-rejected"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="approved packet work",
                idempotency_key="transition-pkt-001-progress",
            )
            backup_path = Path(source_tmp) / "state-backup.json"
            StateBackupService(source).create_backup(backup_path)
            data = json.loads(backup_path.read_text(encoding="utf-8"))
            data["events"] = [data["events"][1]]
            data["event_seq_order"] = [data["events"][0]["event_seq"]]
            data["backup_checksum"] = sha256_text(
                canonical_json({k: v for k, v in data.items() if k != "backup_checksum"})
            )
            backup_path.write_text(json.dumps(data, sort_keys=True, indent=2), encoding="utf-8")

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            with self.assertRaises(ValueError):
                StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(target.latest_event_seq(), 0)

    def test_restore_replay_failure_rolls_back_target_event_log(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.backup import StateBackupService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as source_tmp, tempfile.TemporaryDirectory() as target_tmp:
            source = HarnessStore(Path(source_tmp))
            source.initialize()
            PacketService(source).create_packet(
                packet_id="pkt-001",
                title="Replay rollback backup packet",
                objective="Rollback target when materialized replay fails.",
                risk_class="low",
                scope_summary="Backup restore atomicity.",
                out_of_scope_summary="No external services.",
                change_zones=["src/standard_harness/state/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["restore-rollback"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            backup_path = Path(source_tmp) / "state-backup.json"
            StateBackupService(source).create_backup(backup_path)

            target = HarnessStore(Path(target_tmp))
            target.initialize()
            with target.connection() as conn:
                conn.execute(
                    """
                    create trigger abort_packet_restore
                    before insert on packets
                    begin
                      select raise(abort, 'forced restore materialization failure');
                    end
                    """
                )
                conn.commit()

            with self.assertRaises(Exception):
                StateBackupService(target).restore_backup(backup_path)

            self.assertEqual(target.latest_event_seq(), 0)
