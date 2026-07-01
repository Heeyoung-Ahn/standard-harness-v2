from __future__ import annotations

import hashlib
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.cli.main import main as harness_main
from standard_harness.memory.question_answering import LongMemoryQuestionAnsweringService
from standard_harness.memory.question_answering import LongMemorySourceDiscovery
from standard_harness.memory.question_answering import LongMemorySourceIndexBuilder
from standard_harness.state.replay import StateReplayService
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor_worker_e2e import ConductorWorkerE2ERunner


class ConductorWorkerE2ETests(unittest.TestCase):
    def test_fixture_e2e_records_worker_verifier_adjudication_and_qa_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="fixture",
            )

            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["mode"], "fixture")
            self.assertEqual(result["selectedRoute"], "cross_llm_worker_verifier")
            self.assertEqual(len(result["workerRuns"]), 1)
            self.assertEqual(len(result["verifierRuns"]), 1)
            self.assertEqual(result["realCliEvidenceStatus"], "not_applicable")
            self.assertFalse(result["authorityBoundary"]["approvalStateMutationAllowed"])
            self.assertFalse(result["adjudication"]["truth_claim"])
            self.assertIn("Tester", result["nextRoute"])
            self.assertTrue((root / "_ops" / "evidence" / "PKT-14" / "conductor-worker-e2e" / "evidence-index.json").is_file())

            replay = StateReplayService(HarnessStore(root)).rebuild_materialized_state()
            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replay["unknown_event_types"], [])

            self._seed_evidence_policy(root)
            sources = LongMemorySourceDiscovery(root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(
                index,
                "Did PKT-14 use fixture evidence or real CLI evidence?",
            )
            self.assertEqual(answer["status"], "pass")
            self.assertIn("fixture evidence", answer["answer"])
            self.assertIn("evidence-index.json", json.dumps(answer["sourceRefs"]))
            self.assertFalse((root / "_ops" / "wiki").exists())
            self.assertFalse((root / "_ops" / "friction").exists())
            self.assertFalse((root / "_ops" / "risks").exists())
            self.assertFalse((root / "_ops" / "decisions").exists())

    def test_real_cli_smoke_without_explicit_approval_is_manual_required(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=False,
            )

            self.assertEqual(result["status"], "manual_required")
            self.assertEqual(result["realCliEvidenceStatus"], "manual_required")
            self.assertIn("real_cli_smoke_requires_explicit_approval", result["diagnostic_ids"])
            self.assertEqual(result["workerRuns"], [])
            self.assertEqual(result["verifierRuns"], [])

    def test_unsafe_command_descriptor_blocks_before_provider_execution(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=self._safe_descriptor(["codex", "exec", "$(Get-Content secret.txt)"]),
            )

            self.assertEqual(result["status"], "execution_blocked")
            self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
            self.assertIn("unsafe_command_descriptor", result["diagnostic_ids"])
            self.assertIn("untrusted_shell_interpolation", result["diagnostic_ids"])

    def test_real_cli_command_descriptor_negative_matrix_blocks(self) -> None:
        cases = {
            "newline": ["codex", "exec", "review\nnext"],
            "pipe": ["codex", "exec", "review | tee out.txt"],
            "redirect": ["codex", "exec", "review > out.txt"],
            "subshell": ["codex", "exec", "$(Get-Content secret.txt)"],
            "shell_true": ["codex", "exec", "review"],
        }
        with tempfile.TemporaryDirectory() as tmp:
            for name, argv in cases.items():
                with self.subTest(name=name):
                    descriptor = self._safe_descriptor(argv)
                    if name == "shell_true":
                        descriptor["shell"] = True
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
                    self.assertIn("unsafe_command_descriptor", result["diagnostic_ids"])

    def test_real_cli_missing_timeout_or_cancel_precondition_blocks(self) -> None:
        cases = {
            "timeout_seconds": {"timeout_seconds": None},
            "cancel_supported": {"cancel_supported": False},
        }
        with tempfile.TemporaryDirectory() as tmp:
            for expected_missing, overrides in cases.items():
                with self.subTest(expected_missing=expected_missing):
                    descriptor = self._safe_descriptor(["codex", "exec", "--json"])
                    descriptor.update(overrides)
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
                    self.assertIn("execution_preconditions_missing", result["diagnostic_ids"])
                    self.assertIn(expected_missing, result["diagnostic_ids"])

    def test_real_cli_captured_smoke_records_worker_verifier_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=self._safe_descriptor(["codex", "exec", "--json"], root=root),
                cli_available=True,
            )

            self._assert_captured_recovery_result(result)
            self.assertEqual(result["mode"], "real-smoke")
            self.assertEqual(len(result["workerRuns"]), 1)
            self.assertEqual(len(result["verifierRuns"]), 1)
            self.assertIn("captured-cli-evidence", json.dumps(result["evidenceRefs"]))
            self.assertIn("captured-envelope", json.dumps(result["outputEnvelopeRefs"]))
            evidence_index = root / "_ops" / "evidence" / "PKT-14" / "conductor-worker-e2e" / "evidence-index.json"
            self.assertIn("trusted captured CLI recovery evidence", evidence_index.read_text(encoding="utf-8"))
            artifacts = list(evidence_index.parent.glob("*-captured-artifact.json"))
            self.assertEqual(len(artifacts), 2)
            self.assertIn("trusted_harness_capture", artifacts[0].read_text(encoding="utf-8"))

    def test_real_cli_capture_records_are_required_per_role_provider(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[self._capture_record("Developer", "codex", "codex-cli-local")],
            )
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self.assertEqual(result["status"], "execution_blocked")
            self.assertIn("captured_output_record_missing:Reviewer:claude_code", result["diagnostic_ids"])

    def test_real_cli_accepts_codex_reviewer_capture_when_explicitly_requested(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[
                    self._capture_record("Developer", "codex", "codex-cli-local"),
                    self._capture_record("Reviewer", "codex", "codex-cli-local"),
                ],
                artifact_name="capture-codex-reviewer.json",
            )
            descriptor["reviewer_provider"] = "codex"

            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self._assert_captured_recovery_result(result)
            self.assertEqual(result["verifierRuns"][0]["provider"], "codex")

    def test_real_cli_consumes_packet_topology_for_codex_reviewer_without_string_override(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[
                    self._capture_record("Developer", "codex", "codex-cli-local"),
                    self._capture_record(
                        "Reviewer",
                        "codex",
                        "codex-cli-local",
                        reviewer_id="reviewer_b",
                        review_lens="evidence_review",
                    ),
                ],
                artifact_name="capture-topology-codex-reviewer.json",
            )
            descriptor["providerTopology"] = {
                "projectTopology": {
                    "conductor": {
                        "provider": "codex",
                        "adapterId": "codex-cli-local",
                    }
                },
                "packetTopology": {
                    "roles": {
                        "developer": {
                            "provider": "codex",
                            "adapterId": "codex-cli-local",
                        },
                        "reviewer": {
                            "provider": "codex",
                            "adapterId": "codex-cli-local",
                            "reviewerId": "reviewer_b",
                            "reviewLens": "evidence_review",
                        },
                    },
                    "workerAliases": {
                        "worker1": {"role": "developer"},
                        "worker2": {"role": "reviewer", "reviewerId": "reviewer_b"},
                    },
                },
            }

            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-25",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self._assert_captured_recovery_result(result)
            self.assertEqual(result["verifierRuns"][0]["provider"], "codex")
            self.assertNotIn(
                "captured_output_record_missing:Reviewer:claude_code",
                result["diagnostic_ids"],
            )

    def test_real_cli_reports_full_role_provider_matrix_and_mixed_reviewers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[
                    self._capture_record("Developer", "codex", "codex-cli-local"),
                    self._capture_record(
                        "Reviewer",
                        "claude_code",
                        "claude-code-local",
                        reviewer_id="reviewer_a",
                        review_lens="code_quality_review",
                    ),
                    self._capture_record(
                        "Reviewer",
                        "codex",
                        "codex-cli-local",
                        reviewer_id="reviewer_b",
                        review_lens="evidence_review",
                    ),
                ],
                artifact_name="capture-mixed-reviewers.json",
            )
            descriptor["providerTopology"] = self._provider_topology(
                reviewer=[
                    {
                        "provider": "claude_code",
                        "adapterId": "claude-code-local",
                        "reviewerId": "reviewer_a",
                        "reviewLens": "code_quality_review",
                    },
                    {
                        "provider": "codex",
                        "adapterId": "codex-cli-local",
                        "reviewerId": "reviewer_b",
                        "reviewLens": "evidence_review",
                    },
                ],
                worker2={"role": "reviewer", "reviewerId": "reviewer_b"},
            )

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-25",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self._assert_captured_recovery_result(result)
            topology = result["providerTopologyEvidence"]
            self.assertEqual(topology["schemaVersion"], "standard-harness-provider-topology-evidence/v1")
            self.assertEqual(topology["projectTopology"]["conductor"]["provider"], "codex")
            role_keys = {entry["roleKey"] for entry in topology["roleAssignments"]}
            self.assertEqual(
                role_keys,
                {
                    "project_manager",
                    "planner",
                    "developer",
                    "documenter",
                    "tester",
                    "reviewer",
                },
            )
            reviewer_entries = [
                entry for entry in topology["roleAssignments"] if entry["roleKey"] == "reviewer"
            ]
            self.assertEqual(
                {(entry["reviewerId"], entry["provider"], entry["reviewLens"]) for entry in reviewer_entries},
                {
                    ("reviewer_a", "claude_code", "code_quality_review"),
                    ("reviewer_b", "codex", "evidence_review"),
                },
            )
            self.assertEqual(
                {
                    (entry["reviewerId"], entry["evidenceRef"])
                    for entry in reviewer_entries
                    if entry["readinessState"] == "captured_output_pass"
                },
                {
                    ("reviewer_a", "PKT-14:claude_code:captured-cli-evidence"),
                    ("reviewer_b", "PKT-14:codex:captured-cli-evidence"),
                },
            )
            self.assertEqual(len(result["verifierRuns"]), 2)
            self.assertEqual(
                {(run["provider"], run["reviewerId"], run["reviewLens"]) for run in result["verifierRuns"]},
                {
                    ("claude_code", "reviewer_a", "code_quality_review"),
                    ("codex", "reviewer_b", "evidence_review"),
                },
            )
            evidence_index = root / "_ops" / "evidence" / "PKT-25" / "conductor-worker-e2e" / "evidence-index.json"
            evidence_payload = json.loads(evidence_index.read_text(encoding="utf-8"))
            self.assertEqual(
                evidence_payload["providerTopologyEvidence"]["roleAssignments"],
                topology["roleAssignments"],
            )

    def test_real_cli_provider_topology_invalid_or_conflicting_fields_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cases = {
                "unsupported": (
                    {"planner": {"provider": "gemini", "adapterId": "gemini-local"}},
                    None,
                    "unsupported_provider:planner:gemini",
                ),
                "blank": (
                    {"tester": {"provider": "", "adapterId": "codex-cli-local"}},
                    None,
                    "blank_provider:tester",
                ),
                "conflict": (
                    {"reviewer": {"provider": "codex", "adapterId": "codex-cli-local"}},
                    "claude_code",
                    "conflicting_provider_declaration:Reviewer",
                ),
            }
            for name, (role_overrides, reviewer_provider, expected) in cases.items():
                with self.subTest(name=name):
                    descriptor = self._safe_descriptor(
                        ["codex", "exec", "--json"],
                        root=root,
                        records=self._default_capture_records(),
                        artifact_name=f"capture-invalid-{name}.json",
                    )
                    descriptor["providerTopology"] = self._provider_topology(
                        role_overrides=role_overrides
                    )
                    if reviewer_provider is not None:
                        descriptor["reviewer_provider"] = reviewer_provider

                    result = ConductorWorkerE2ERunner(root).run(
                        packet_id=f"PKT-25-{name}",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn(expected, result["diagnostic_ids"])

    def test_real_cli_provider_topology_review_remediation_cases_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cases = {
                "invalid_conductor": (
                    {"projectTopology": {"conductor": {"provider": "gemini", "adapterId": "gemini-local"}}},
                    "unsupported_provider:project_conductor:gemini",
                ),
                "unknown_role": (
                    {"packetTopology": {"roles": {"analyst": {"provider": "codex", "adapterId": "codex-cli-local"}}}},
                    "unknown_role_key:analyst",
                ),
                "ambiguous_non_reviewer": (
                    {"packetTopology": {"roles": {"developer": [{"provider": "codex", "adapterId": "codex-cli-local"}]}}},
                    "ambiguous_role_assignment:developer",
                ),
                "duplicate_reviewer": (
                    {
                        "packetTopology": {
                            "roles": {
                                "reviewer": [
                                    {
                                        "provider": "codex",
                                        "adapterId": "codex-cli-local",
                                        "reviewerId": "reviewer_a",
                                        "reviewLens": "challenge_review",
                                    },
                                    {
                                        "provider": "claude_code",
                                        "adapterId": "claude-code-local",
                                        "reviewerId": "reviewer_a",
                                        "reviewLens": "evidence_review",
                                    },
                                ]
                            }
                        }
                    },
                    "duplicate_reviewer_id:reviewer_a",
                ),
                "missing_reviewer_lens": (
                    {
                        "packetTopology": {
                            "roles": {
                                "reviewer": {
                                    "provider": "codex",
                                    "adapterId": "codex-cli-local",
                                    "reviewerId": "reviewer_a",
                                }
                            }
                        }
                    },
                    "missing_review_lens:reviewer_a",
                ),
                "invalid_worker_alias": (
                    {
                        "packetTopology": {
                            "roles": {
                                "developer": {"provider": "codex", "adapterId": "codex-cli-local"},
                                "reviewer": {
                                    "provider": "codex",
                                    "adapterId": "codex-cli-local",
                                    "reviewerId": "reviewer_a",
                                    "reviewLens": "challenge_review",
                                },
                            },
                            "workerAliases": {"worker2": {"role": "reviewer", "reviewerId": "missing"}},
                        }
                    },
                    "unknown_worker_alias_reviewer:worker2:missing",
                ),
                "adapter_mismatch": (
                    {
                        "packetTopology": {
                            "roles": {
                                "developer": {
                                    "provider": "codex",
                                    "adapterId": "claude-code-local",
                                }
                            }
                        }
                    },
                    "adapter_provider_mismatch:developer:codex:claude-code-local",
                ),
                "nested_authority_field": (
                    {
                        "packetTopology": {
                            "roles": {
                                "developer": {
                                    "provider": "codex",
                                    "adapterId": "codex-cli-local",
                                    "approvalStateMutationAllowed": True,
                                }
                            }
                        }
                    },
                    "unknown_assignment_field:developer:approvalStateMutationAllowed",
                ),
                "unknown_worker_alias_key": (
                    {
                        "packetTopology": {
                            "roles": {
                                "developer": {"provider": "codex", "adapterId": "codex-cli-local"}
                            },
                            "workerAliases": {
                                "worker3": {"role": "developer"}
                            },
                        }
                    },
                    "unknown_worker_alias_key:worker3",
                ),
                "nested_worker_alias_authority_field": (
                    {
                        "packetTopology": {
                            "roles": {
                                "developer": {"provider": "codex", "adapterId": "codex-cli-local"}
                            },
                            "workerAliases": {
                                "worker1": {
                                    "role": "developer",
                                    "approvalStateMutationAllowed": True,
                                }
                            },
                        }
                    },
                    "unknown_worker_alias_field:worker1:approvalStateMutationAllowed",
                ),
                "legacy_conflict_even_when_same_provider": (
                    {
                        "packetTopology": {
                            "roles": {
                                "reviewer": {
                                    "provider": "claude_code",
                                    "adapterId": "claude-code-local",
                                    "reviewerId": "reviewer_a",
                                    "reviewLens": "challenge_review",
                                }
                            }
                        }
                    },
                    "conflicting_provider_declaration:Reviewer",
                ),
            }
            for name, (topology, expected) in cases.items():
                with self.subTest(name=name):
                    descriptor = self._safe_descriptor(
                        ["codex", "exec", "--json"],
                        root=root,
                        records=self._default_capture_records(),
                        artifact_name=f"capture-review-remediation-{name}.json",
                    )
                    descriptor["providerTopology"] = topology
                    if name == "legacy_conflict_even_when_same_provider":
                        descriptor["reviewer_provider"] = "claude_code"

                    result = ConductorWorkerE2ERunner(root).run(
                        packet_id=f"PKT-25-{name}",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn(expected, result["diagnostic_ids"])

    def test_real_cli_provider_topology_matrix_covers_every_role_against_both_providers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            roles = [
                "project_manager",
                "planner",
                "developer",
                "documenter",
                "tester",
                "reviewer",
            ]
            providers = {
                "codex": "codex-cli-local",
                "claude_code": "claude-code-local",
            }
            for role_key in roles:
                for provider, adapter_id in providers.items():
                    with self.subTest(role=role_key, provider=provider):
                        reviewer = {
                            "provider": "codex",
                            "adapterId": "codex-cli-local",
                            "reviewerId": "reviewer_b",
                            "reviewLens": "evidence_review",
                        }
                        role_overrides: dict[str, dict[str, object]] = {
                            role_key: {"provider": provider, "adapterId": adapter_id}
                        }
                        if role_key == "reviewer":
                            role_overrides = {}
                            reviewer = {
                                "provider": provider,
                                "adapterId": adapter_id,
                                "reviewerId": f"{provider}_reviewer",
                                "reviewLens": "challenge_review",
                            }
                        descriptor = self._safe_descriptor(
                            ["codex", "exec", "--json"],
                            root=root,
                            records=[
                                self._capture_record(
                                    "Developer",
                                    provider if role_key == "developer" else "codex",
                                    adapter_id if role_key == "developer" else "codex-cli-local",
                                ),
                                self._capture_record(
                                    "Reviewer",
                                    provider if role_key == "reviewer" else "codex",
                                    adapter_id if role_key == "reviewer" else "codex-cli-local",
                                    reviewer_id=f"{provider}_reviewer" if role_key == "reviewer" else "reviewer_b",
                                    review_lens="challenge_review" if role_key == "reviewer" else "evidence_review",
                                ),
                            ],
                            artifact_name=f"capture-matrix-{role_key}-{provider}.json",
                        )
                        descriptor["providerTopology"] = self._provider_topology(
                            role_overrides=role_overrides,
                            reviewer=reviewer,
                            worker2={
                                "role": "reviewer",
                                "reviewerId": f"{provider}_reviewer" if role_key == "reviewer" else "reviewer_b",
                            },
                        )

                        result = ConductorWorkerE2ERunner(root).run(
                            packet_id=f"PKT-25-matrix-{role_key}-{provider}",
                            mode="real-smoke",
                            real_cli_approval=True,
                            command_descriptor=descriptor,
                            cli_available=True,
                        )

                        self._assert_captured_recovery_result(result)
                        assignment = next(
                            entry
                            for entry in result["providerTopologyEvidence"]["roleAssignments"]
                            if entry["roleKey"] == role_key
                        )
                        self.assertEqual(assignment["provider"], provider)
                        self.assertEqual(assignment["adapterId"], adapter_id)

    def test_cli_persists_and_reports_provider_topology(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            topology = self._provider_topology()
            topology["packetTopology"]["roles"]["reviewer"] = {
                "provider": "codex",
                "adapterId": "codex-cli-local",
                "reviewerId": " reviewer_b ",
                "reviewLens": " evidence_review ",
            }
            topology["packetTopology"]["workerAliases"]["worker2"] = {
                "role": " Reviewer ",
                "reviewerId": " reviewer_b ",
            }
            record_output = io.StringIO()
            with redirect_stdout(record_output):
                record_exit = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "provider-topology",
                        "record",
                        "--packet-id",
                        "PKT-25",
                        "--topology-json",
                        json.dumps(topology),
                        "--idempotency-key",
                        "PKT-25:provider-topology",
                    ]
                )
            report_output = io.StringIO()
            with redirect_stdout(report_output):
                report_exit = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "provider-topology",
                        "report",
                        "--packet-id",
                        "PKT-25",
                    ]
                )

            self.assertEqual(record_exit, 0)
            self.assertEqual(report_exit, 0)
            recorded = json.loads(record_output.getvalue())["providerTopology"]
            reported = json.loads(report_output.getvalue())["providerTopology"]
            self.assertEqual(recorded["packetId"], "PKT-25")
            self.assertEqual(reported["projectTopology"]["conductor"]["provider"], "codex")
            self.assertEqual(
                set(reported["packetTopology"]["roles"]),
                {
                    "project_manager",
                    "planner",
                    "developer",
                    "documenter",
                    "tester",
                    "reviewer",
                },
            )
            self.assertEqual(
                reported["packetTopology"]["workerAliases"]["worker2"],
                {"role": "reviewer", "reviewerId": "reviewer_b"},
            )
            self.assertEqual(
                reported["packetTopology"]["roles"]["reviewer"]["reviewerId"],
                "reviewer_b",
            )
            self.assertEqual(
                reported["packetTopology"]["roles"]["reviewer"]["reviewLens"],
                "evidence_review",
            )

    def test_cli_provider_topology_rejects_nested_authority_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            topology = self._provider_topology(
                role_overrides={
                    "developer": {
                        "provider": "codex",
                        "adapterId": "codex-cli-local",
                        "approvalStateMutationAllowed": True,
                    }
                }
            )
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "provider-topology",
                        "record",
                        "--packet-id",
                        "PKT-25",
                        "--topology-json",
                        json.dumps(topology),
                        "--idempotency-key",
                        "PKT-25:nested-authority",
                    ]
                )
            payload = json.loads(output.getvalue())

            self.assertEqual(exit_code, 1)
            self.assertEqual(payload["status"], "error")
            self.assertIn(
                "unknown_assignment_field:developer:approvalStateMutationAllowed",
                payload["diagnostics"][0]["message"],
            )

    def test_cli_provider_topology_rejects_worker_alias_authority_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            topology = self._provider_topology()
            topology["packetTopology"]["workerAliases"]["worker1"][
                "approvalStateMutationAllowed"
            ] = True
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "provider-topology",
                        "record",
                        "--packet-id",
                        "PKT-25",
                        "--topology-json",
                        json.dumps(topology),
                        "--idempotency-key",
                        "PKT-25:alias-authority",
                    ]
                )
            payload = json.loads(output.getvalue())

            self.assertEqual(exit_code, 1)
            self.assertEqual(payload["status"], "error")
            self.assertIn(
                "unknown_worker_alias_field:worker1:approvalStateMutationAllowed",
                payload["diagnostics"][0]["message"],
            )

    def test_real_cli_provider_topology_rejects_review_lens_and_evidence_ref_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cases = {
                "review_lens_mismatch": (
                    [
                        self._capture_record("Developer", "codex", "codex-cli-local"),
                        self._capture_record(
                            "Reviewer",
                            "codex",
                            "codex-cli-local",
                            reviewer_id="reviewer_b",
                            review_lens="code_quality_review",
                        ),
                    ],
                    self._provider_topology(
                        reviewer={
                            "provider": "codex",
                            "adapterId": "codex-cli-local",
                            "reviewerId": "reviewer_b",
                            "reviewLens": "evidence_review",
                        }
                    ),
                    "captured_output_review_lens_mismatch:Reviewer:codex:reviewer_b:evidence_review",
                ),
                "evidence_ref_mismatch": (
                    [
                        self._capture_record(
                            "Developer",
                            "codex",
                            "codex-cli-local",
                            evidence_id="actual-developer-evidence",
                        ),
                        self._capture_record(
                            "Reviewer",
                            "codex",
                            "codex-cli-local",
                            reviewer_id="reviewer_b",
                            review_lens="evidence_review",
                        ),
                    ],
                    self._provider_topology(
                        role_overrides={
                            "developer": {
                                "provider": "codex",
                                "adapterId": "codex-cli-local",
                                "evidenceRef": "expected-developer-evidence",
                            }
                        }
                    ),
                    "captured_output_evidence_ref_mismatch:Developer:codex:expected-developer-evidence",
                ),
            }
            for name, (records, topology, expected) in cases.items():
                with self.subTest(name=name):
                    descriptor = self._safe_descriptor(
                        ["codex", "exec", "--json"],
                        root=root,
                        records=records,
                        artifact_name=f"capture-{name}.json",
                    )
                    descriptor["providerTopology"] = topology

                    result = ConductorWorkerE2ERunner(root).run(
                        packet_id=f"PKT-25-{name}",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn(expected, result["diagnostic_ids"])

    def test_real_cli_provider_topology_canonicalizes_reviewer_assignment_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[
                    self._capture_record("Developer", "codex", "codex-cli-local"),
                    self._capture_record(
                        "Reviewer",
                        "codex",
                        "codex-cli-local",
                        reviewer_id="reviewer_b",
                        review_lens="evidence_review",
                    ),
                ],
            )
            descriptor["providerTopology"] = self._provider_topology(
                reviewer={
                    "provider": "codex",
                    "adapterId": "codex-cli-local",
                    "reviewerId": " reviewer_b ",
                    "reviewLens": " evidence_review ",
                },
                worker2={"role": "reviewer", "reviewerId": " reviewer_b "},
            )

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-25-reviewer-assignment-canonical",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self._assert_captured_recovery_result(result)
            reviewer_assignment = next(
                entry
                for entry in result["providerTopologyEvidence"]["roleAssignments"]
                if entry["role"] == "Reviewer"
            )
            self.assertEqual(reviewer_assignment["reviewerId"], "reviewer_b")
            self.assertEqual(reviewer_assignment["reviewLens"], "evidence_review")

    def test_real_cli_failed_or_timeout_capture_cannot_pass(self) -> None:
        cases = {
            "captured_output_failed": {"exit_code": 1, "result_status": "failed"},
            "captured_output_timeout": {"timeout": True},
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for expected_diagnostic, overrides in cases.items():
                with self.subTest(expected_diagnostic=expected_diagnostic):
                    records = self._default_capture_records()
                    records[0].update(overrides)
                    descriptor = self._safe_descriptor(
                        ["codex", "exec", "--json"],
                        root=root,
                        records=records,
                    )
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn(expected_diagnostic, result["diagnostic_ids"])

    def test_real_cli_rejects_inline_or_sensitive_capture_material(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inline_descriptor = self._safe_descriptor(["codex", "exec", "--json"])
            inline_result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=inline_descriptor,
                cli_available=True,
            )
            sensitive_records = self._default_capture_records()
            sensitive_records[0]["artifact"]["content"]["api_key"] = "sk-test-secret"
            sensitive_descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=sensitive_records,
                artifact_name="sensitive-capture.json",
            )
            sensitive_result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=sensitive_descriptor,
                cli_available=True,
            )

            self.assertEqual(inline_result["status"], "execution_blocked")
            self.assertIn(
                "captured_output_requires_trusted_capture_artifact",
                inline_result["diagnostic_ids"],
            )
            self.assertEqual(sensitive_result["status"], "execution_blocked")
            self.assertTrue(
                any(
                    diagnostic.startswith("sensitive_capture_material")
                    for diagnostic in sensitive_result["diagnostic_ids"]
                )
            )

    def test_packet_id_validation_blocks_path_escape(self) -> None:
        invalid_packet_ids = [
            "../PKT-14",
            "PKT/14",
            "PKT-14\\bad",
            "C:\\tmp\\PKT-14",
            "",
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for packet_id in invalid_packet_ids:
                with self.subTest(packet_id=packet_id):
                    result = ConductorWorkerE2ERunner(root).run(
                        packet_id=packet_id,
                        mode="fixture",
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn("invalid_packet_id", result["diagnostic_ids"])
            self.assertFalse((root / "_ops" / "evidence").exists())

    def test_cli_exposes_conductor_worker_e2e_json_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "conductor-worker-e2e",
                        "--packet",
                        "PKT-14",
                        "--mode",
                        "fixture",
                    ]
                )

            payload = json.loads(output.getvalue())
            result = payload["conductorWorkerE2E"]
            self.assertEqual(exit_code, 0)
            self.assertEqual(result["schemaVersion"], "standard-harness-conductor-worker-e2e/v1")
            self.assertEqual(result["packetId"], "PKT-14")
            self.assertIn("selectedConductor", result)
            self.assertIn("outputEnvelopeRefs", result)
            self.assertIn("authorityBoundary", result)

    def _seed_evidence_policy(self, repo_root: Path) -> None:
        self._write(
            repo_root / "_harness/policies/evidence-classification.yaml",
            json.dumps(
                {
                    "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
                    "defaults": {"classification": "INTERNAL"},
                    "promotionRules": {
                        "PUBLIC": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "INTERNAL": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "SENSITIVE": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                        "SECRET": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                    },
                    "registrationRules": {
                        "SECRET": {"blocked": True, "diagnostic": "secret_evidence_registered"}
                    },
                }
            ),
        )

    def _assert_captured_recovery_result(self, result: dict[str, object]) -> None:
        self.assertEqual(result["status"], "captured_output_recovery_only")
        self.assertEqual(result["realCliEvidenceStatus"], "captured_output_recovery_only")
        self.assertEqual(result["deliveryLoopReadiness"], "captured_output_recovery_only")
        self.assertFalse(result["productizationEvidence"])
        self.assertIn("captured_output_recovery_only", result["diagnostic_ids"])

    @staticmethod
    def _safe_descriptor(
        argv: list[str],
        *,
        root: Path | None = None,
        records: list[dict[str, object]] | None = None,
        artifact_name: str = "capture.json",
    ) -> dict[str, object]:
        capture = {
            "trusted_harness_capture": True,
            "records": records or ConductorWorkerE2ETests._default_capture_records(),
        }
        captured_output: dict[str, object]
        if root is None:
            captured_output = capture
        else:
            capture_path = root / "_ops" / "capture" / "PKT-14" / artifact_name
            capture_path.parent.mkdir(parents=True, exist_ok=True)
            content = json.dumps(capture, indent=2, sort_keys=True)
            capture_path.write_text(content, encoding="utf-8")
            captured_output = {
                "source": "harness_capture_artifact",
                "capture_artifact_ref": "_ops/capture/PKT-14/" + artifact_name,
                "capture_artifact_sha256": "sha256:" + hashlib.sha256(
                    content.encode("utf-8")
                ).hexdigest(),
            }
        return {
            "argv": argv,
            "shell": False,
            "timeout_seconds": 120,
            "cancel_supported": True,
            "non_interactive_capture": True,
            "input_snapshot_current": True,
            "explicit_local_configuration": True,
            "authenticated_outside_repo": True,
            "captured_output": captured_output,
        }

    @staticmethod
    def _default_capture_records() -> list[dict[str, object]]:
        return [
            ConductorWorkerE2ETests._capture_record(
                "Developer", "codex", "codex-cli-local"
            ),
            ConductorWorkerE2ETests._capture_record(
                "Reviewer", "claude_code", "claude-code-local"
            ),
        ]

    @staticmethod
    def _capture_record(
        role: str,
        provider: str,
        adapter_id: str,
        *,
        reviewer_id: str | None = None,
        review_lens: str | None = None,
        evidence_id: str | None = None,
    ) -> dict[str, object]:
        return {
            "role": role,
            "provider": provider,
            "adapter_id": adapter_id,
            **({"reviewer_id": reviewer_id} if reviewer_id else {}),
            **({"review_lens": review_lens} if review_lens else {}),
            "argv": [provider, "captured", "--json"],
            "shell": False,
            "exit_code": 0,
            "result_status": "passed",
            "timeout": False,
            "cancel_status": "not_requested",
            "stdout_sha256": f"sha256:{provider}-stdout",
            "stderr_sha256": f"sha256:{provider}-stderr",
            "artifact": {
                "kind": "implementation" if role == "Developer" else "review",
                "content": {
                    "source": "trusted_harness_capture",
                    "role": role,
                    "provider": provider,
                },
            },
            "evidence_id": evidence_id or f"PKT-14:{provider}:captured-cli-evidence",
        }

    @staticmethod
    def _provider_topology(
        *,
        role_overrides: dict[str, dict[str, object]] | None = None,
        reviewer: dict[str, object] | list[dict[str, object]] | None = None,
        worker2: dict[str, object] | None = None,
    ) -> dict[str, object]:
        roles: dict[str, object] = {
            "project_manager": {"provider": "codex", "adapterId": "codex-cli-local"},
            "planner": {"provider": "claude_code", "adapterId": "claude-code-local"},
            "developer": {"provider": "codex", "adapterId": "codex-cli-local"},
            "documenter": {"provider": "codex", "adapterId": "codex-cli-local"},
            "tester": {"provider": "codex", "adapterId": "codex-cli-local"},
            "reviewer": reviewer
            or {
                "provider": "codex",
                "adapterId": "codex-cli-local",
                "reviewerId": "reviewer_b",
                "reviewLens": "evidence_review",
            },
        }
        roles.update(role_overrides or {})
        return {
            "projectTopology": {
                "conductor": {"provider": "codex", "adapterId": "codex-cli-local"}
            },
            "packetTopology": {
                "roles": roles,
                "workerAliases": {
                    "worker1": {"role": "developer"},
                    "worker2": worker2 or {"role": "reviewer", "reviewerId": "reviewer_b"},
                },
            },
        }

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
