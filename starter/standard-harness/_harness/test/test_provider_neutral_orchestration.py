import tempfile
import unittest
from pathlib import Path
import sys


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator
from standard_harness.adapters.contract_matrix import AdapterContractMatrix
from standard_harness.adapters.envelope import AdapterOutputEnvelope
from standard_harness.adapters.invocation import AdapterInvocationLedger
from standard_harness.adapters.manifest import AdapterManifest
from standard_harness.state.replay import StateReplayService
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.provider_orchestration import (
    ProviderOrchestrationLedger,
    ProviderOrchestrationPolicy,
    ProviderOrchestrationRecorder,
)


class ProviderNeutralOrchestrationTests(unittest.TestCase):
    def codex_manifest(self, root: Path) -> AdapterManifest:
        return AdapterManifest.from_dict(
            {
                "adapter_id": "codex-cli-local",
                "adapter_version": "1.0",
                "provider": "codex",
                "supported_roles": ["Developer", "Reviewer"],
                "execution_modes": ["local_subscription_cli", "manual"],
                "credential_mode": "local_subscription",
                "evidence_modes": ["cli_command", "artifact_manifest"],
                "read_write_capability": "write_artifacts",
                "artifact_export_capability": "artifact_manifest",
                "permission_roots": [str(root)],
                "known_limitations": ["requires user-managed local login"],
                "failure_modes": ["success", "blocked", "provider_unavailable"],
                "capabilities": {
                    "command_template": ["codex", "exec", "--json"],
                    "non_interactive": True,
                },
            }
        )

    def claude_manifest(self, root: Path) -> AdapterManifest:
        return AdapterManifest.from_dict(
            {
                "adapter_id": "claude-code-local",
                "adapter_version": "1.0",
                "provider": "claude_code",
                "supported_roles": ["Reviewer"],
                "execution_modes": ["local_subscription_cli", "manual"],
                "credential_mode": "local_subscription",
                "evidence_modes": ["cli_command", "artifact_manifest"],
                "read_write_capability": "read_artifacts",
                "artifact_export_capability": "artifact_manifest",
                "permission_roots": [str(root)],
                "known_limitations": ["requires user-managed local login"],
                "failure_modes": ["success", "blocked", "timeout"],
                "capabilities": {
                    "command_template": ["claude", "-p"],
                    "non_interactive": True,
                },
            }
        )

    def test_routes_roles_to_replaceable_local_subscription_adapters(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = ProviderOrchestrationPolicy(
                [self.codex_manifest(root), self.claude_manifest(root)]
            )

            developer_route = policy.select_adapter("Developer")
            reviewer_route = policy.select_adapter(
                "Reviewer", preferred_provider="claude_code"
            )

            self.assertEqual(developer_route["status"], "selected")
            self.assertEqual(developer_route["adapter_id"], "codex-cli-local")
            self.assertEqual(developer_route["credential_mode"], "local_subscription")
            self.assertIn("local_subscription_cli", developer_route["execution_modes"])
            self.assertFalse(developer_route["product_identity"])
            self.assertEqual(reviewer_route["adapter_id"], "claude-code-local")
            self.assertFalse(reviewer_route["product_identity"])

    def test_unavailable_cli_returns_manual_run_bundle_without_success_claim(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = ProviderOrchestrationPolicy([self.codex_manifest(root)])

            route = policy.prepare_execution(
                role="Developer",
                packet_id="PKT-06",
                input_snapshot_hash="sha256:input",
                cli_available=False,
            )

            self.assertEqual(route["status"], "manual_required")
            self.assertEqual(route["diagnostic_code"], "provider_cli_unavailable")
            self.assertEqual(route["manual_run_bundle"]["adapter_id"], "codex-cli-local")
            self.assertEqual(route["manual_run_bundle"]["packet_id"], "PKT-06")
            self.assertNotIn("success", route)

    def test_manifest_rejects_api_key_or_token_storage_for_local_subscription_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = AdapterManifest.from_dict(
                {
                    "adapter_id": "unsafe-codex",
                    "adapter_version": "1.0",
                    "provider": "codex",
                    "supported_roles": ["Developer"],
                    "execution_modes": ["local_subscription_cli"],
                    "credential_mode": "local_subscription",
                    "evidence_modes": ["cli_command"],
                    "read_write_capability": "write_artifacts",
                    "artifact_export_capability": "artifact_manifest",
                    "permission_roots": [str(root)],
                    "known_limitations": [],
                    "failure_modes": ["success"],
                    "capabilities": {"session_token": "secret"},
                }
            )

            validation = AdapterContractMatrix().validate_manifest(manifest)

            self.assertEqual(validation["status"], "blocked")
            self.assertIn("credential_material_declared", validation["diagnostics"])

    def test_manifest_rejects_env_token_cookie_session_and_provider_cache_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for key, value in {
                "OPENAI_API_KEY": "env",
                "ANTHROPIC_API_KEY": "env",
                "auth_token": "raw",
                "bearer_token": "raw",
                "cookie_file": str(root / "cookies.json"),
                "session_path": str(root / ".claude" / "session.json"),
                "provider_cache_path": str(root / ".codex"),
            }.items():
                with self.subTest(key=key):
                    manifest = AdapterManifest.from_dict(
                        {
                            "adapter_id": f"unsafe-{key.lower()}",
                            "adapter_version": "1.0",
                            "provider": "codex",
                            "supported_roles": ["Developer"],
                            "execution_modes": ["local_subscription_cli"],
                            "credential_mode": "local_subscription",
                            "evidence_modes": ["cli_command"],
                            "read_write_capability": "write_artifacts",
                            "artifact_export_capability": "artifact_manifest",
                            "permission_roots": [str(root)],
                            "known_limitations": [],
                            "failure_modes": ["success"],
                            "capabilities": {key: value},
                        }
                    )

                    validation = AdapterContractMatrix().validate_manifest(manifest)

                    self.assertEqual(validation["status"], "blocked")
                    self.assertIn("credential_material_declared", validation["diagnostics"])

    def test_output_envelope_records_provider_run_without_direct_state_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact = root / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")

            envelope = AdapterOutputEnvelope.from_dict(
                {
                    "adapter_run_id": "run-1",
                    "input_snapshot_hash": "sha256:input",
                    "permission_roots": [str(root)],
                    "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                    "event_request": {
                        "event_type": "adapter.output_submitted",
                        "packet_id": "PKT-06",
                    },
                    "failure_classification": None,
                    "evidence_provenance": {
                        "execution_mode": "local_subscription_cli",
                        "result_status": "passed",
                        "evidence_id": "ev-1",
                        "provider": "codex",
                        "role": "Developer",
                    },
                }
            )

            self.assertTrue(envelope.is_production_execution_evidence())
            self.assertEqual(envelope.evidence_provenance["provider"], "codex")

    def test_boundary_validator_rejects_worker_supplied_root_expansion(self):
        with tempfile.TemporaryDirectory() as tmp:
            trusted = Path(tmp) / "trusted"
            trusted.mkdir()
            outside = Path(tmp) / "outside"
            outside.mkdir()
            artifact = outside / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")

            result = AdapterBoundaryValidator().validate_envelope(
                {
                    "adapter_run_id": "run-escape",
                    "input_snapshot_hash": "sha256:input",
                    "permission_roots": [str(Path(tmp))],
                    "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                    "event_request": {"event_type": "adapter.output_submitted"},
                    "failure_classification": None,
                    "evidence_provenance": {
                        "execution_mode": "local_subscription_cli",
                        "result_status": "passed",
                        "evidence_id": "ev-escape",
                    },
                },
                trusted_permission_roots=[str(trusted)],
            )

            self.assertEqual(result["status"], "rejected")
            self.assertEqual(result["failure_classification"], "path_escape")

    def test_boundary_validator_rejects_symlink_artifact_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            trusted = Path(tmp) / "trusted"
            trusted.mkdir()
            outside = Path(tmp) / "outside"
            outside.mkdir()
            outside_artifact = outside / "adapter-output.json"
            outside_artifact.write_text("{}", encoding="utf-8")
            link = trusted / "linked-output.json"
            try:
                link.symlink_to(outside_artifact)
            except OSError as exc:
                self.skipTest(f"symlink creation unavailable: {exc}")

            result = AdapterBoundaryValidator().validate_envelope(
                {
                    "adapter_run_id": "run-symlink-escape",
                    "input_snapshot_hash": "sha256:input",
                    "permission_roots": [str(trusted)],
                    "artifact_manifest": [{"path": str(link), "kind": "review"}],
                    "event_request": {"event_type": "adapter.output_submitted"},
                    "failure_classification": None,
                    "evidence_provenance": {
                        "execution_mode": "local_subscription_cli",
                        "result_status": "passed",
                        "evidence_id": "ev-symlink",
                    },
                },
                trusted_permission_roots=[str(trusted)],
            )

            self.assertEqual(result["status"], "rejected")
            self.assertEqual(result["failure_classification"], "path_escape")

    def test_boundary_validator_rejects_stale_snapshot_direct_mutation_missing_provenance_and_mock_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact = root / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")
            base = {
                "adapter_run_id": "run-base",
                "input_snapshot_hash": "sha256:input",
                "permission_roots": [str(root)],
                "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                "event_request": {"event_type": "adapter.output_submitted"},
                "failure_classification": None,
                "evidence_provenance": {
                    "execution_mode": "local_subscription_cli",
                    "result_status": "passed",
                    "evidence_id": "ev-base",
                },
            }
            validator = AdapterBoundaryValidator()

            stale = validator.validate_envelope(
                dict(base),
                trusted_permission_roots=[str(root)],
                expected_input_snapshot_hash="sha256:new",
            )
            direct_mutation_payload = dict(base)
            direct_mutation_payload["event_request"] = {
                "event_type": "state.mutate",
                "packet_id": "PKT-06",
            }
            direct_mutation = validator.validate_envelope(
                direct_mutation_payload, trusted_permission_roots=[str(root)]
            )
            missing_provenance_payload = dict(base)
            missing_provenance_payload["evidence_provenance"] = {}
            missing_provenance = validator.validate_envelope(
                missing_provenance_payload, trusted_permission_roots=[str(root)]
            )
            mock_payload = dict(base)
            mock_payload["evidence_provenance"] = {
                "execution_mode": "mock",
                "result_status": "passed",
                "evidence_id": "ev-mock",
            }
            mock_success = validator.validate_envelope(
                mock_payload, trusted_permission_roots=[str(root)]
            )

            self.assertEqual(stale["failure_classification"], "stale")
            self.assertEqual(direct_mutation["failure_classification"], "direct_state_mutation")
            self.assertEqual(missing_provenance["failure_classification"], "malformed_envelope")
            self.assertEqual(mock_success["failure_classification"], "mock_success")

    def test_boundary_validator_and_ledger_reject_missing_trusted_roots(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact = root / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")
            envelope = {
                "adapter_run_id": "run-no-trusted-roots",
                "input_snapshot_hash": "sha256:input",
                "permission_roots": [str(root)],
                "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                "event_request": {"event_type": "adapter.output_submitted"},
                "failure_classification": None,
                "evidence_provenance": {
                    "execution_mode": "local_subscription_cli",
                    "result_status": "passed",
                    "evidence_id": "ev-no-roots",
                },
            }

            validation = AdapterBoundaryValidator().validate_envelope(envelope)

            self.assertEqual(validation["status"], "rejected")
            self.assertEqual(validation["failure_classification"], "path_escape")
            ledger = AdapterInvocationLedger(HarnessStore(root))
            with self.assertRaises(ValueError):
                ledger.record_invocation(
                    adapter_run_id="run-no-trusted-roots",
                    adapter_id="codex-cli-local",
                    adapter_version="1.0",
                    input_snapshot_hash="sha256:input",
                    permission_roots=[str(root)],
                    artifact_manifest=[{"path": str(artifact), "kind": "review"}],
                    event_request={"event_type": "adapter.output_submitted"},
                    failure_classification=None,
                    evidence_provenance={
                        "execution_mode": "local_subscription_cli",
                        "result_status": "passed",
                        "evidence_id": "ev-no-roots",
                    },
                    timeout_seconds=120,
                    retry_count=0,
                    cancel_status="not_requested",
                    idempotency_key="run-no-trusted-roots",
                )

    def test_execution_readiness_blocks_until_all_preconditions_are_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = ProviderOrchestrationPolicy([self.codex_manifest(root)])

            blocked = policy.prepare_execution(
                role="Developer",
                packet_id="PKT-06",
                input_snapshot_hash="sha256:input",
                cli_available=True,
            )
            ready = policy.prepare_execution(
                role="Developer",
                packet_id="PKT-06",
                input_snapshot_hash="sha256:input",
                cli_available=True,
                execution_preconditions={
                    "approved_packet_boundary": True,
                    "explicit_local_configuration": True,
                    "authenticated_outside_repo": True,
                    "command_descriptor": {"argv": ["codex", "exec", "--json"]},
                    "timeout_seconds": 120,
                    "cancel_supported": True,
                    "non_interactive_capture": True,
                    "input_snapshot_current": True,
                },
            )

            self.assertEqual(blocked["status"], "execution_blocked")
            self.assertIn("approved_packet_boundary", blocked["missing_preconditions"])
            self.assertEqual(ready["status"], "ready")

    def test_execution_readiness_rejects_unsafe_command_descriptors(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = ProviderOrchestrationPolicy([self.codex_manifest(root)])

            route = policy.prepare_execution(
                role="Developer",
                packet_id="PKT-07",
                input_snapshot_hash="sha256:input",
                cli_available=True,
                execution_preconditions={
                    "approved_packet_boundary": True,
                    "explicit_local_configuration": True,
                    "authenticated_outside_repo": True,
                    "command_descriptor": {
                        "argv": ["codex", "exec", "$(Get-Content secret.txt)"]
                    },
                    "timeout_seconds": 120,
                    "cancel_supported": True,
                    "non_interactive_capture": True,
                    "input_snapshot_current": True,
                },
            )

            self.assertEqual(route["status"], "execution_blocked")
            self.assertEqual(route["diagnostic_code"], "unsafe_command_descriptor")
            self.assertIn(
                "untrusted_shell_interpolation",
                route["command_descriptor_diagnostics"],
            )

    def test_provider_orchestration_ledger_records_queryable_runs_and_adjudications(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            store = HarnessStore(root)
            ledger = ProviderOrchestrationLedger(store)
            policy = ProviderOrchestrationPolicy([self.codex_manifest(root)])
            route = policy.select_adapter("Developer")
            artifact = root / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")
            output_envelope = {
                "adapter_run_id": "codex-run",
                "input_snapshot_hash": "sha256:input",
                "permission_roots": [str(root)],
                "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                "event_request": {"event_type": "adapter.output_submitted"},
                "failure_classification": None,
                "evidence_provenance": {
                    "execution_mode": "local_subscription_cli",
                    "result_status": "passed",
                    "evidence_id": "ev-1",
                },
            }

            run = ledger.record_run(
                orchestration_run_id="orch-run-1",
                packet_id="PKT-06",
                role="Developer",
                selected_route=route,
                input_snapshot_hash="sha256:input",
                command_descriptor={"mode": "manual_run_bundle"},
                output_envelope=output_envelope,
                evidence_refs=["ev-1"],
                diagnostics=[],
                adjudication_state="none",
                status="evidence_recorded",
                idempotency_key="orch-run-1",
            )
            adjudication = ledger.record_adjudication(
                packet_id="PKT-06",
                left_adapter_run_id="codex-run",
                right_adapter_run_id="claude-run",
                disagreement="review disagreement",
                follow_up_owner="Reviewer",
                idempotency_key="adjudication-1",
            )
            matching_runs = ledger.query_runs(
                packet_id="PKT-06",
                role="Developer",
                adapter_id="codex-cli-local",
                provider="codex",
                status="evidence_recorded",
                adjudication_state="none",
            )
            matching_adjudications = ledger.query_adjudications(
                packet_id="PKT-06", status="adjudication_required"
            )

            self.assertEqual(run["truth_claim"], False)
            self.assertEqual(len(matching_runs), 1)
            self.assertEqual(matching_runs[0]["evidence_refs"], ["ev-1"])
            self.assertEqual(adjudication["truth_claim"], False)
            self.assertEqual(len(matching_adjudications), 1)

    def test_provider_orchestration_ledger_rejects_untrusted_envelope_and_replays_events(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            store = HarnessStore(root)
            ledger = ProviderOrchestrationLedger(store)
            policy = ProviderOrchestrationPolicy([self.codex_manifest(root)])
            route = policy.select_adapter("Developer")
            artifact = root / "adapter-output.json"
            artifact.write_text("{}", encoding="utf-8")
            direct_mutation_envelope = {
                "adapter_run_id": "codex-run-bad",
                "input_snapshot_hash": "sha256:input",
                "permission_roots": [str(root)],
                "artifact_manifest": [{"path": str(artifact), "kind": "review"}],
                "event_request": {"event_type": "state.mutate"},
                "failure_classification": None,
                "evidence_provenance": {
                    "execution_mode": "local_subscription_cli",
                    "result_status": "passed",
                    "evidence_id": "ev-bad",
                },
            }

            with self.assertRaises(ValueError):
                ledger.record_run(
                    orchestration_run_id="orch-run-bad",
                    packet_id="PKT-06",
                    role="Developer",
                    selected_route=route,
                    input_snapshot_hash="sha256:input",
                    command_descriptor={"mode": "manual_run_bundle"},
                    output_envelope=direct_mutation_envelope,
                    evidence_refs=["ev-bad"],
                    diagnostics=[],
                    adjudication_state="none",
                    status="evidence_recorded",
                    idempotency_key="orch-run-bad",
                )

            valid_envelope = dict(direct_mutation_envelope)
            valid_envelope["adapter_run_id"] = "codex-run-good"
            valid_envelope["event_request"] = {"event_type": "adapter.output_submitted"}
            valid_envelope["evidence_provenance"] = {
                "execution_mode": "local_subscription_cli",
                "result_status": "passed",
                "evidence_id": "ev-good",
            }
            ledger.record_run(
                orchestration_run_id="orch-run-good",
                packet_id="PKT-06",
                role="Developer",
                selected_route=route,
                input_snapshot_hash="sha256:input",
                command_descriptor={"mode": "manual_run_bundle"},
                output_envelope=valid_envelope,
                evidence_refs=["ev-good"],
                diagnostics=[],
                adjudication_state="none",
                status="evidence_recorded",
                idempotency_key="orch-run-good",
            )
            ledger.record_adjudication(
                packet_id="PKT-06",
                left_adapter_run_id="codex-run-good",
                right_adapter_run_id="claude-run",
                disagreement="review disagreement",
                follow_up_owner="Reviewer",
                idempotency_key="adjudication-good",
            )

            replay = StateReplayService(store).rebuild_materialized_state()

            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replay["unknown_event_types"], [])

    def test_cross_provider_disagreement_is_adjudication_input_not_truth(self):
        recorder = ProviderOrchestrationRecorder()

        record = recorder.record_disagreement(
            packet_id="PKT-06",
            left_adapter_run_id="codex-run",
            right_adapter_run_id="claude-run",
            disagreement="security reviewer found token risk; developer did not",
        )

        self.assertEqual(record["status"], "adjudication_required")
        self.assertFalse(record["truth_claim"])
        self.assertEqual(record["follow_up_owner"], "Reviewer")


if __name__ == "__main__":
    unittest.main()
