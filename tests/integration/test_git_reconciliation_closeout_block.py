import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class GitReconciliationCloseoutBlockTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_untracked_file_in_packet_owned_zone_blocks_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.gitops.reconciliation import GitReconciliationService
        from standard_harness.gitops.snapshots import GitSnapshotService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_ready_packet(store, repo)
            (repo / "src" / "unregistered.py").write_text("print('new')\n", encoding="utf-8")

            GitSnapshotService(store).record_snapshot(
                git_snapshot_id="snap-untracked",
                repo_root=repo,
                worktree_path=repo,
                idempotency_key="snapshot-untracked",
            )
            reconciliation = GitReconciliationService(store).record_reconciliation(
                reconciliation_id="recon-untracked",
                packet_id="pkt-001",
                git_snapshot_id="snap-untracked",
                idempotency_key="reconcile-untracked",
            )
            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="closeout requires clean packet-owned filesystem",
                rationale="Attempt closeout with untracked source file.",
                idempotency_key="closeout-001",
            )

            self.assertIn("unregistered_change", reconciliation["unresolved_classifications"])
            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("filesystem_drift_unresolved", closeout["diagnostic_ids"])

    def test_closeout_runs_packet_owned_drift_check_before_decision(self):
        from standard_harness.domain.closeout import CloseoutService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_ready_packet(store, repo)
            (repo / "src" / "unregistered.py").write_text("print('new')\n", encoding="utf-8")

            closeout = CloseoutService(store).close_packet(
                closeout_id="co-automatic-drift",
                packet_id="pkt-001",
                authority_basis="closeout requires clean packet-owned filesystem",
                rationale="Attempt closeout without pre-recorded reconciliation.",
                idempotency_key="closeout-automatic-drift",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("filesystem_drift_unresolved", closeout["diagnostic_ids"])
            with store.connection() as conn:
                drift = conn.execute(
                    """
                    select drift_type, path from filesystem_drifts
                    where packet_id = ? and resolution_status = 'open'
                    """,
                    ("pkt-001",),
                ).fetchone()
            self.assertEqual(dict(drift), {"drift_type": "untracked", "path": "src/unregistered.py"})


def _init_repo(path: Path) -> Path:
    (path / "src").mkdir(parents=True)
    (path / "src" / "app.py").write_text("print('hello')\n", encoding="utf-8")
    _git(path, "init")
    _git(path, "config", "user.email", "test@example.invalid")
    _git(path, "config", "user.name", "Harness Test")
    _git(path, "add", ".")
    _git(path, "commit", "-m", "initial")
    return path


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _store(repo: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(repo)
    store.initialize()
    return store


def _seed_ready_packet(store, repo: Path):
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Closeout git reconciliation packet",
        objective="Close only after packet-owned Git state is reconciled.",
        risk_class="medium",
        scope_summary="Source files under src/.",
        out_of_scope_summary="No remote Git operations.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["clean-git-reconciliation"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/git.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-001"],
        completion_classification="unverified",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Packet can close when Git reconciliation is clean.",
        status="proposed",
        idempotency_key="acceptance-ac-001",
    )
    evidence = EvidenceService(store)
    evidence.register_evidence(
        evidence_id="ev-001",
        packet_id="pkt-001",
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(repo),
        environment_fingerprint="test",
        artifact_path="tests/integration/test_git_reconciliation_closeout_block.py",
        content="passed",
        result_status="passed",
        rationale="closeout fixture evidence",
        idempotency_key="evidence-ev-001",
    )
    evidence.record_claim(
        claim_id="claim-001",
        packet_id="pkt-001",
        requirement_id="REQ-001",
        acceptance_criterion_id="ac-001",
        evidence_ids=["ev-001"],
        support_status="supported",
        idempotency_key="claim-001",
    )
    gates = GateService(store)
    gates.declare_gate(
        gate_id="gate-001",
        packet_id="pkt-001",
        gate_type="evidence",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key="gate-declare-001",
    )
    gates.activate_gate(
        gate_activation_id="gact-001",
        gate_id="gate-001",
        packet_id="pkt-001",
        idempotency_key="gate-activate-001",
    )
    gates.record_gate_result(
        gate_result_id="gres-001",
        gate_id="gate-001",
        packet_id="pkt-001",
        checked_claim_ids=["claim-001"],
        evidence_ids=["ev-001"],
        status="pass",
        requirement_level="hard",
        rationale="supported by passed evidence",
        idempotency_key="gate-result-001",
    )


if __name__ == "__main__":
    unittest.main()
