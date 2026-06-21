import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CloudOrchestrationContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_remote_work_requires_packet_actor_permissions_snapshot_and_evidence_output(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            result = CloudOrchestrationService(store).validate_remote_request(
                packet_id="",
                actor_id="",
                actor_role="",
                permission_roots=[],
                input_snapshot_hash="",
                evidence_output={},
            )

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(
                set(result["diagnostic_ids"]),
                {
                    "missing_packet_id",
                    "missing_actor_identity",
                    "missing_permission_roots",
                    "missing_input_snapshot",
                    "missing_evidence_output",
                },
            )

    def test_cloud_orchestration_record_contains_contract_fields(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=False)
            run = CloudOrchestrationService(store).record_run(
                orchestration_run_id="cloud-001",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                adapter_run_ids=[],
                status="blocked",
                failure_classification="manual_path_required",
                diagnostic_ids=["manual_local_fallback_required"],
                evidence_output={"artifact_path": "evidence/cloud-001.json", "content_hash": "sha256:evidence"},
                idempotency_key="cloud-001",
            )

            self.assertEqual(run["orchestration_run_id"], "cloud-001")
            self.assertEqual(run["packet_id"], "pkt-001")
            self.assertEqual(run["actor_id"], "dev-1")
            self.assertEqual(run["actor_role"], "Developer")
            self.assertEqual(run["remote_environment_id"], "remote-dev")
            self.assertEqual(run["permission_roots"], ["src/"])
            self.assertEqual(run["input_snapshot_hash"], "sha256:input")
            self.assertEqual(run["adapter_run_ids"], [])
            self.assertEqual(run["status"], "blocked")
            self.assertEqual(run["failure_classification"], "manual_path_required")
            self.assertGreaterEqual(run["source_watermark"], 1)

    def test_record_run_derives_approval_and_failure_diagnostics(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=True)

            run = CloudOrchestrationService(store).record_run(
                orchestration_run_id="cloud-direct",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                adapter_run_ids=[],
                status="pass",
                failure_classification="timeout",
                diagnostic_ids=[],
                evidence_output={"artifact_path": "evidence/cloud.json", "content_hash": "sha256:evidence"},
                idempotency_key="cloud-direct",
            )

            self.assertEqual(run["status"], "blocked")
            self.assertIn("missing_approval", run["diagnostic_ids"])
            self.assertIn("cloud_timeout", run["diagnostic_ids"])

    def test_adapter_run_must_match_snapshot_permissions_and_evidence_output(self):
        from standard_harness.adapters.invocation import AdapterInvocationLedger
        from standard_harness.cloud.orchestration import CloudOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            store = _store(root)
            _seed_packet(store, approval_required=False)
            AdapterInvocationLedger(store).record_invocation(
                adapter_run_id="adapter-001",
                adapter_id="cloud-adapter",
                adapter_version="1",
                input_snapshot_hash="sha256:different",
                permission_roots=[str(root / "src")],
                artifact_manifest=[
                    {"path": str(root / "src" / "evidence" / "cloud.json"), "content_hash": "sha256:evidence"}
                ],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "cloud",
                    "result_status": "passed",
                    "evidence_id": "ev-cloud",
                },
                timeout_seconds=60,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-001",
            )

            run = CloudOrchestrationService(store).record_run(
                orchestration_run_id="cloud-adapter-mismatch",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=[str(root / "src")],
                input_snapshot_hash="sha256:input",
                adapter_run_ids=["adapter-001"],
                status="blocked",
                failure_classification=None,
                diagnostic_ids=[],
                evidence_output={"artifact_path": str(root / "src" / "evidence" / "cloud.json"), "content_hash": "sha256:evidence"},
                idempotency_key="cloud-adapter-mismatch",
            )

            self.assertEqual(run["status"], "blocked")
            self.assertIn("adapter_snapshot_mismatch", run["diagnostic_ids"])

    def test_cloud_orchestration_cannot_bypass_packet_approval(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService
        from standard_harness.domain.packets import PacketService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=True)

            result = CloudOrchestrationService(store).start_remote_work(
                orchestration_run_id="cloud-missing-approval",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                evidence_output={"artifact_path": "evidence/cloud.json", "content_hash": "sha256:evidence"},
                cloud_service_available=True,
                idempotency_key="cloud-missing-approval",
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("missing_approval", result["diagnostic_ids"])
            self.assertEqual(PacketService(store).get_packet("pkt-001")["lifecycle_state"], "planned")

    def test_cloud_orchestration_cannot_satisfy_evidence_gate_or_closeout_by_itself(self):
        from standard_harness.cloud.orchestration import CloudOrchestrationService
        from standard_harness.completion.coverage import ProjectCompletionCoverage

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_requirement_only(store)
            result = CloudOrchestrationService(store).start_remote_work(
                orchestration_run_id="cloud-approved",
                packet_id="pkt-001",
                actor_id="dev-1",
                actor_role="Developer",
                remote_environment_id="remote-dev",
                permission_roots=["src/"],
                input_snapshot_hash="sha256:input",
                evidence_output={"artifact_path": "evidence/cloud.json", "content_hash": "sha256:evidence"},
                cloud_service_available=True,
                idempotency_key="cloud-approved",
            )

            completion = ProjectCompletionCoverage(store).evaluate(requirement_id="REQ-001")

            self.assertEqual(result["status"], "blocked")
            self.assertIn("manual_local_fallback_required", result["diagnostic_ids"])
            self.assertEqual(completion["status"], "blocked")
            self.assertIn("missing_supported_claim", {d["error_code"] for d in completion["diagnostics"]})


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store, *, approval_required: bool):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Cloud orchestration packet",
        objective="Validate remote work contract.",
        risk_class="medium",
        scope_summary="Remote work contract.",
        out_of_scope_summary="No cloud bypass.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["cloud-evidence"],
        closeout_criteria=["passing-gate"],
        owner="owner",
        approval_required=approval_required,
        idempotency_key="packet-create-pkt-001",
    )


def _seed_requirement_only(store):
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry

    _seed_packet(store, approval_required=True)
    PacketService(store).approve_packet(
        packet_id="pkt-001",
        approver_id="human-owner",
        approver_role="Human Owner",
        authority_basis="explicit approval",
        approved_scope="cloud orchestration fixture",
        rationale="fixture approval",
        idempotency_key="approve-pkt-001",
    )
    RequirementRegistry(store).register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/cloud.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-001"],
        completion_classification="evidence-required",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Cloud orchestration cannot bypass evidence or gates.",
        status="approved",
        idempotency_key="acceptance-ac-001",
    )


if __name__ == "__main__":
    unittest.main()
