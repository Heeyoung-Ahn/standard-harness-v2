import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class GitReconciliationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_snapshot_records_branch_identity_and_commit(self):
        from standard_harness.gitops.snapshots import GitSnapshotService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)

            snapshot = GitSnapshotService(store).record_snapshot(
                git_snapshot_id="snap-branch",
                repo_root=repo,
                worktree_path=repo,
                idempotency_key="snapshot-branch",
            )

            self.assertTrue(snapshot["branch_name"])
            self.assertNotEqual(snapshot["commit_id"], "UNBORN")
            self.assertEqual(snapshot["repo_root"], str(repo))
            self.assertEqual(snapshot["source_watermark"], 0)
            self.assertEqual(
                GitSnapshotService(store).get_snapshot("snap-branch")["branch_name"],
                snapshot["branch_name"],
            )

    def test_ignored_file_is_classified_separately(self):
        from standard_harness.gitops.reconciliation import GitReconciliationService
        from standard_harness.gitops.snapshots import GitSnapshotService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            (repo / "build" / "ignored.log").write_text("ignored\n", encoding="utf-8")

            GitSnapshotService(store).record_snapshot(
                git_snapshot_id="snap-ignored",
                repo_root=repo,
                worktree_path=repo,
                idempotency_key="snapshot-ignored",
            )
            reconciliation = GitReconciliationService(store).record_reconciliation(
                reconciliation_id="recon-ignored",
                packet_id="pkt-001",
                git_snapshot_id="snap-ignored",
                idempotency_key="reconcile-ignored",
            )

            self.assertIn("ignored_change", _classification_types(reconciliation))
            self.assertEqual(reconciliation["unresolved_classifications"], [])

    def test_modified_registered_artifact_is_expected_when_evidence_exists(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.gitops.reconciliation import GitReconciliationService
        from standard_harness.gitops.snapshots import GitSnapshotService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            ArtifactRegistry(store).register_artifact(
                artifact_id="artifact-app",
                artifact_type="source",
                path="src/app.py",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-app",
            )
            EvidenceService(store).register_evidence(
                evidence_id="ev-artifact-app",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(repo),
                environment_fingerprint="test",
                artifact_path="src/app.py",
                content="passed",
                result_status="passed",
                rationale="artifact path has passing evidence",
                idempotency_key="evidence-artifact-app",
            )
            (repo / "src" / "app.py").write_text("print('changed')\n", encoding="utf-8")

            GitSnapshotService(store).record_snapshot(
                git_snapshot_id="snap-modified",
                repo_root=repo,
                worktree_path=repo,
                idempotency_key="snapshot-modified",
            )
            reconciliation = GitReconciliationService(store).record_reconciliation(
                reconciliation_id="recon-modified",
                packet_id="pkt-001",
                git_snapshot_id="snap-modified",
                idempotency_key="reconcile-modified",
            )

            self.assertIn("expected_registered_change", _classification_types(reconciliation))
            self.assertEqual(reconciliation["unresolved_classifications"], [])

    def test_moved_and_deleted_artifacts_create_reconciliation_events(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.reconciliation import GitReconciliationService
        from standard_harness.gitops.snapshots import GitSnapshotService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            artifacts = ArtifactRegistry(store)
            artifacts.register_artifact(
                artifact_id="artifact-moved",
                artifact_type="source",
                path="src/moved.py",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-moved",
            )
            artifacts.register_artifact(
                artifact_id="artifact-deleted",
                artifact_type="source",
                path="src/deleted.py",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-deleted",
            )
            _git(repo, "mv", "src/moved.py", "src/renamed.py")
            (repo / "src" / "deleted.py").unlink()

            GitSnapshotService(store).record_snapshot(
                git_snapshot_id="snap-drift",
                repo_root=repo,
                worktree_path=repo,
                idempotency_key="snapshot-drift",
            )
            reconciliation = GitReconciliationService(store).record_reconciliation(
                reconciliation_id="recon-drift",
                packet_id="pkt-001",
                git_snapshot_id="snap-drift",
                idempotency_key="reconcile-drift",
            )

            classifications = _classification_types(reconciliation)
            self.assertIn("moved_artifact", classifications)
            self.assertIn("deleted_artifact", classifications)
            with store.connection() as conn:
                row = conn.execute(
                    "select event_type from events where event_type = 'git.reconciliation_recorded'"
                ).fetchone()
            self.assertIsNotNone(row)

    def test_automatic_repair_requires_explicit_approval(self):
        from standard_harness.gitops.reconciliation import GitReconciliationService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            service = GitReconciliationService(store)

            repair = service.propose_repair(
                repair_id="repair-001",
                reconciliation_id="recon-001",
                action="register untracked file",
                approval_record_id=None,
            )

            self.assertEqual(repair["status"], "blocked")
            self.assertEqual(repair["classification"], "repair_requires_approval")

    def test_automatic_repair_rejects_unknown_approval_record(self):
        from standard_harness.gitops.reconciliation import GitReconciliationService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)

            repair = GitReconciliationService(store).propose_repair(
                repair_id="repair-unknown",
                reconciliation_id="recon-001",
                action="register untracked file",
                approval_record_id="apr-does-not-exist",
            )

            self.assertEqual(repair["status"], "blocked")
            self.assertEqual(repair["classification"], "repair_requires_approval")

    def test_automatic_repair_requires_existing_reconciliation_scope(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.gitops.reconciliation import GitReconciliationService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            approval = PacketService(store).approve_packet(
                packet_id="pkt-001",
                approver_id="owner",
                approver_role="Human Owner",
                authority_basis="explicit repair approval",
                approved_scope="repair git drift",
                rationale="repair approval fixture",
                idempotency_key="approve-repair",
            )

            repair = GitReconciliationService(store).propose_repair(
                repair_id="repair-missing-recon",
                reconciliation_id="missing-recon",
                action="register untracked file",
                approval_record_id=approval["approval_record_id"],
            )

            self.assertEqual(repair["status"], "blocked")
            self.assertEqual(repair["classification"], "repair_requires_approval")


def _classification_types(reconciliation):
    return {item["classification"] for item in reconciliation["classifications"]}


def _init_repo(path: Path) -> Path:
    (path / "src").mkdir(parents=True)
    (path / "build").mkdir()
    (path / "src" / "app.py").write_text("print('hello')\n", encoding="utf-8")
    (path / "src" / "moved.py").write_text("print('move')\n", encoding="utf-8")
    (path / "src" / "deleted.py").write_text("print('delete')\n", encoding="utf-8")
    (path / ".gitignore").write_text("build/\n", encoding="utf-8")
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


def _seed_packet(store):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Git reconciliation packet",
        objective="Track packet-owned filesystem drift.",
        risk_class="medium",
        scope_summary="Reconcile source files.",
        out_of_scope_summary="No remote Git operations.",
        change_zones=["src/", "build/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["clean-git-reconciliation"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )


if __name__ == "__main__":
    unittest.main()
