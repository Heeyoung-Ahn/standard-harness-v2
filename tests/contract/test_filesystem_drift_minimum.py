import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class FilesystemDriftMinimumTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_packet_owned_files_are_checked_for_untracked_modified_deleted_and_moved(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            artifacts = ArtifactRegistry(store)
            for artifact_id, path in {
                "artifact-modified": "src/modified.txt",
                "artifact-deleted": "src/deleted.txt",
                "artifact-moved": "src/moved.txt",
            }.items():
                artifacts.register_artifact(
                    artifact_id=artifact_id,
                    artifact_type="generated",
                    path=path,
                    owner="developer",
                    lifecycle_status="generated",
                    source_reference="packet",
                    packet_id="pkt-001",
                    idempotency_key=artifact_id,
                )
            (repo / "src" / "modified.txt").write_text("changed\n", encoding="utf-8")
            (repo / "src" / "deleted.txt").unlink()
            _git(repo, "mv", "src/moved.txt", "src/renamed.txt")
            (repo / "src" / "untracked.txt").write_text("new\n", encoding="utf-8")

            report = FilesystemDriftService(store).detect_packet_drift(
                drift_id="drift-all",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-all",
            )

            drift_types = {item["drift_type"] for item in report["drifts"]}
            self.assertTrue({"untracked", "modified", "deleted", "moved"}.issubset(drift_types))
            self.assertTrue(all("remediation" in item for item in report["drifts"]))

    def test_generated_artifact_registry_entries_are_compared_against_filesystem(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            ArtifactRegistry(store).register_artifact(
                artifact_id="artifact-generated",
                artifact_type="generated",
                path="src/generated.txt",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-generated",
            )
            (repo / "src" / "generated.txt").unlink()

            report = FilesystemDriftService(store).detect_packet_drift(
                drift_id="drift-generated",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-generated",
            )

            self.assertEqual(report["drifts"][0]["artifact_id"], "artifact-generated")
            self.assertEqual(report["drifts"][0]["drift_type"], "deleted")

    def test_unresolved_drift_exposes_machine_readable_remediation(self):
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            (repo / "src" / "unregistered.txt").write_text("new\n", encoding="utf-8")

            service = FilesystemDriftService(store)
            service.detect_packet_drift(
                drift_id="drift-remediation",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-remediation",
            )
            unresolved = service.unresolved_drift("pkt-001")

            self.assertEqual(unresolved[0]["remediation"]["diagnostic_id"], "filesystem_drift_unresolved")
            self.assertIn("suggested_actions", unresolved[0]["remediation"])

    def test_drift_checks_work_without_advanced_git_branch_reconciliation(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            ArtifactRegistry(store).register_artifact(
                artifact_id="artifact-missing",
                artifact_type="generated",
                path="src/generated.txt",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-missing",
            )
            (repo / "src" / "generated.txt").unlink()
            (repo / "src" / "local-only.txt").write_text("local\n", encoding="utf-8")

            report = FilesystemDriftService(store).detect_packet_drift(
                drift_id="drift-no-git",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-no-git",
                use_git=False,
            )

            drift_types = {item["drift_type"] for item in report["drifts"]}
            self.assertIn("deleted", drift_types)
            self.assertIn("untracked", drift_types)
            self.assertEqual(report["source"], "filesystem_scan")

    def test_filesystem_scan_detects_modified_and_moved_registered_artifacts_from_registry_hash(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            artifacts = ArtifactRegistry(store)
            artifacts.register_artifact(
                artifact_id="artifact-modified",
                artifact_type="generated",
                path="src/modified.txt",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-modified",
            )
            artifacts.register_artifact(
                artifact_id="artifact-moved",
                artifact_type="generated",
                path="src/moved.txt",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-moved",
            )
            (repo / "src" / "modified.txt").write_text("changed\n", encoding="utf-8")
            _git(repo, "mv", "src/moved.txt", "src/moved-renamed.txt")

            report = FilesystemDriftService(store).detect_packet_drift(
                drift_id="drift-scan-modified-moved",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-scan-modified-moved",
                use_git=False,
            )

            drift_types = {item["drift_type"] for item in report["drifts"]}
            self.assertIn("modified", drift_types)
            self.assertIn("moved", drift_types)
            moved_artifact_drifts = [
                item["drift_type"]
                for item in report["drifts"]
                if item.get("artifact_id") == "artifact-moved"
            ]
            self.assertEqual(moved_artifact_drifts, ["moved"])

    def test_filesystem_scan_reports_predeclared_generated_artifact_missing_without_hash(self):
        from standard_harness.domain.artifacts import ArtifactRegistry
        from standard_harness.gitops.drift import FilesystemDriftService

        with tempfile.TemporaryDirectory() as tmp:
            repo = _init_repo(Path(tmp))
            store = _store(repo)
            _seed_packet(store)
            ArtifactRegistry(store).register_artifact(
                artifact_id="artifact-predeclared",
                artifact_type="generated",
                path="src/not-yet-written.txt",
                owner="developer",
                lifecycle_status="generated",
                source_reference="packet",
                packet_id="pkt-001",
                idempotency_key="artifact-predeclared",
            )

            report = FilesystemDriftService(store).detect_packet_drift(
                drift_id="drift-predeclared",
                packet_id="pkt-001",
                repo_root=repo,
                idempotency_key="drift-predeclared",
                use_git=False,
            )

            artifact_drifts = [
                item for item in report["drifts"] if item.get("artifact_id") == "artifact-predeclared"
            ]
            self.assertEqual(len(artifact_drifts), 1)
            self.assertEqual(artifact_drifts[0]["drift_type"], "deleted")


def _init_repo(path: Path) -> Path:
    (path / "src").mkdir(parents=True)
    for name in ("modified.txt", "deleted.txt", "moved.txt", "generated.txt"):
        (path / "src" / name).write_text(f"{name}\n", encoding="utf-8")
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
        title="Filesystem drift packet",
        objective="Detect packet-owned file drift.",
        risk_class="medium",
        scope_summary="Source file drift.",
        out_of_scope_summary="No remote repair.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["clean-filesystem"],
        owner="owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )


if __name__ == "__main__":
    unittest.main()
