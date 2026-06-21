import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class OperationalMemoryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_operational_memory_is_derived_from_events_and_not_competing_ssot(self):
        from standard_harness.memory.operational import OperationalMemoryService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)

            memory = OperationalMemoryService(store).generate_snapshot(
                memory_snapshot_id="mem-001",
                idempotency_key="mem-001",
            )

            self.assertEqual(memory["source"], "canonical_events")
            self.assertEqual(memory["entries"][0]["entry_type"], "decision")
            self.assertEqual(memory["entries"][0]["source_event_type"], "packet.created")

    def test_stale_memory_snapshot_is_rejected_when_newer_events_exist(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.memory.operational import OperationalMemoryService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)
            service = OperationalMemoryService(store)
            memory = service.generate_snapshot(
                memory_snapshot_id="mem-001",
                idempotency_key="mem-001",
            )
            PacketService(store).transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="owner",
                actor_role="Owner",
                authority_basis="new canonical event",
                idempotency_key="transition-pkt-001",
            )

            freshness = service.freshness(memory)

            self.assertEqual(freshness["freshness_status"], "stale")
            self.assertEqual(freshness["consumer_behavior"], "reject")


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store):
    from tests.contract.test_pmo_projection import _seed_packet as seed

    seed(store, approval_required=True)


if __name__ == "__main__":
    unittest.main()
