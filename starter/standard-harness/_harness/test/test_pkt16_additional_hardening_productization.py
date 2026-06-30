from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.domain.packets import PacketService  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402
from standard_harness.validation.aggregator import ValidationService  # noqa: E402


class Pkt16AdditionalHardeningProductizationTests(unittest.TestCase):
    def test_intent_sensitive_packet_blocks_when_precise_planning_fields_are_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H1",
                title="Intent fidelity hardening",
                objective="Preserve Human Owner intent.",
                packet_type="harness-system",
                risk_class="high",
                change_zones=["_harness/system/standard_harness/domain/requirements.py"],
                acceptance_criteria_ids=["AC-PKT16-H1"],
                evidence_requirements=["intent-fidelity"],
                closeout_criteria=["Intent conformance is proven."],
                closeout_plan={
                    "planningHardening": {
                        "intentSensitive": True,
                        "intentFidelity": {
                            "intendedOutcome": "Reduce LLM intent gap.",
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h1",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H1")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("missing_must_preserve_intent", codes)
        self.assertIn("missing_forbidden_reinterpretations", codes)
        self.assertIn("missing_intent_evidence_targets", codes)

    def test_projection_artifacts_cannot_claim_requirement_release_or_closeout_authority(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H7",
                title="Projection authority boundary",
                objective="Keep planning projections non-authoritative.",
                packet_type="harness-system",
                risk_class="high",
                change_zones=["_harness/system/standard_harness/validation/aggregator.py"],
                acceptance_criteria_ids=["AC-PKT16-H7"],
                evidence_requirements=["projection-boundary"],
                closeout_criteria=["Projection authority escalation is blocked."],
                closeout_plan={
                    "planningHardening": {
                        "projections": [
                            {
                                "projectionId": "prd-1",
                                "projectionOnly": True,
                                "authorityClaims": [
                                    "create_requirement",
                                    "approve_release",
                                    "close_packet",
                                ],
                            }
                        ]
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h7",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H7")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("projection_authority_claim_forbidden", codes)

    def test_projection_authority_claims_are_normalized_before_forbidden_claim_checks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H7-ALIAS",
                title="Projection authority alias boundary",
                objective="Keep projection authority aliases blocked.",
                packet_type="harness-system",
                risk_class="high",
                change_zones=["_harness/system/standard_harness/validation/aggregator.py"],
                acceptance_criteria_ids=["AC-PKT16-H7"],
                evidence_requirements=["projection-boundary"],
                closeout_criteria=["Projection authority alias escalation is blocked."],
                closeout_plan={
                    "planningHardening": {
                        "projections": [
                            {
                                "projectionId": "prd-1",
                                "projectionOnly": True,
                                "authorityClaims": [
                                    "Approve-Release",
                                    "RFC approved",
                                    "risk accepted",
                                ],
                            }
                        ]
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h7-alias",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H7-ALIAS")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("projection_authority_claim_forbidden", codes)

    def test_user_uat_readiness_cannot_be_claimed_from_developer_done_only(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-DEVONLY",
                title="Product readiness before User UAT",
                objective="Prevent Developer Done from becoming User UAT approval.",
                packet_type="product-feature",
                risk_class="high",
                change_zones=["apps/web"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=["product-readiness-before-uat"],
                closeout_criteria=["User UAT entry is gated by Tester and Reviewer evidence."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "required",
                            "userFacing": True,
                            "userUatRequired": True,
                            "developerDone": {
                                "status": "implementation-complete-only",
                                "requirementImplementationChecked": True,
                                "unitApiTestsPassed": True,
                                "browserSmokePassed": True,
                                "placeholderDiagnosticSweepPassed": True,
                                "dbBackedRuntimeConfirmed": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/developer-done.json"],
                                "userUatReady": True,
                            },
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-devonly",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-DEVONLY")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("developer_done_cannot_approve_user_uat", codes)
        self.assertIn("tester_product_readiness_gate_missing", codes)
        self.assertIn("product_readiness_risk_axis_regression_missing", codes)
        self.assertIn("reviewer_product_quality_review_missing", codes)
        self.assertIn("user_uat_entry_evidence_missing", codes)

    def test_developer_done_blocks_string_and_alias_uat_approval_claims(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-DEV-ALIAS",
                title="Product readiness before User UAT",
                objective="Prevent Developer Done authority aliases.",
                packet_type="product-feature",
                risk_class="high",
                change_zones=["apps/web"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=["product-readiness-before-uat"],
                closeout_criteria=["User UAT entry is gated by Tester and Reviewer evidence."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "required",
                            "userFacing": True,
                            "userUatRequired": True,
                            "developerDone": {
                                "status": "implementation-complete-only",
                                "requirementImplementationChecked": True,
                                "unitApiTestsPassed": True,
                                "browserSmokePassed": True,
                                "placeholderDiagnosticSweepPassed": True,
                                "dbBackedRuntimeConfirmed": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/developer-done.json"],
                                "userUatReady": "approved",
                                "uatApproval": "ready",
                            },
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-dev-alias",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-DEV-ALIAS")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("developer_done_cannot_approve_user_uat", codes)

    def test_product_web_packet_cannot_omit_h10_gate_by_skipping_opt_in_evidence_requirement(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-OMIT",
                title="Product UI packet",
                objective="Prepare a user-facing dashboard for User UAT.",
                packet_type="product-feature",
                risk_class="high",
                change_zones=["apps/web/src/dashboard"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=[],
                closeout_criteria=["User UAT ready after browser verification."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        }
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-omit",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-OMIT")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("product_readiness_before_user_uat_gate_missing", codes)

    def test_non_user_facing_packets_can_mark_product_readiness_uat_gate_not_applicable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            _write_evidence_files(repo_root, ["_ops/evidence/PKT-16/h10-not-applicable.json"])
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-NA",
                title="Non user-facing hardening packet",
                objective="Allow explicit no-user-facing no-UAT rationale.",
                packet_type="harness-system",
                risk_class="medium",
                change_zones=["_harness/system/standard_harness/validation/aggregator.py"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=["product-readiness-before-uat"],
                closeout_criteria=["H10 is explicitly not applicable."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "not-applicable",
                            "userFacing": False,
                            "userUatRequired": False,
                            "rationale": "Validator-only packet with no browser UI, user account, or User UAT handoff surface.",
                            "noUserFacingSurfaceConfirmed": True,
                            "noUserUatHandoffConfirmed": True,
                            "noBrowserStateChanged": True,
                            "evidenceRefs": ["_ops/evidence/PKT-16/h10-not-applicable.json"],
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-na",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=repo_root,
            ).validate_packet("PKT-16-H10-NA")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertNotIn("product_readiness_before_user_uat_gate_missing", codes)
        self.assertNotIn("product_readiness_not_applicable_rationale_missing", codes)

    def test_not_applicable_h10_gate_requires_evidence_backed_no_surface_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-NA-WEAK",
                title="Weak N/A claim",
                objective="Try to bypass product readiness.",
                packet_type="harness-system",
                risk_class="medium",
                change_zones=["_harness/system/standard_harness/validation/aggregator.py"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=["product-readiness-before-uat"],
                closeout_criteria=["H10 is not applicable."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "not-applicable",
                            "userFacing": False,
                            "userUatRequired": False,
                            "rationale": "N/A",
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-na-weak",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-NA-WEAK")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("product_readiness_not_applicable_rationale_missing", codes)

    def test_product_web_packet_cannot_mark_h10_not_applicable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-NA-CONFLICT",
                title="Product UI packet with N/A claim",
                objective="Prepare a user-facing dashboard for User UAT.",
                packet_type="product-feature",
                risk_class="high",
                change_zones=["apps/web/src/dashboard"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=[],
                closeout_criteria=["User UAT ready after browser verification."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "not-applicable",
                            "userFacing": False,
                            "userUatRequired": False,
                            "rationale": "No UI",
                            "noUserFacingSurfaceConfirmed": True,
                            "noUserUatHandoffConfirmed": True,
                            "noBrowserStateChanged": True,
                            "evidenceRefs": ["_ops/evidence/PKT-16/h10-not-applicable.json"],
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-na-conflict",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-NA-CONFLICT")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("product_readiness_not_applicable_contradicts_packet_surface", codes)

    def test_h10_evidence_refs_must_be_packet_bound_and_valid_shape(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-H10-BAD-EVIDENCE",
                title="Product readiness evidence binding",
                objective="Reject forged H10 evidence refs.",
                packet_type="product-feature",
                risk_class="high",
                change_zones=["apps/web"],
                acceptance_criteria_ids=["AC-PKT16-H10"],
                evidence_requirements=["product-readiness-before-uat"],
                closeout_criteria=["User UAT ready after browser verification."],
                closeout_plan={
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "required",
                            "userFacing": True,
                            "userUatRequired": True,
                            "developerDone": {
                                "status": "implementation-complete-only",
                                "requirementImplementationChecked": True,
                                "unitApiTestsPassed": True,
                                "browserSmokePassed": True,
                                "placeholderDiagnosticSweepPassed": True,
                                "dbBackedRuntimeConfirmed": True,
                                "evidenceRefs": ["_ops/evidence/OTHER/developer-done.json"],
                                "userUatReady": False,
                            },
                            "testerProductReadinessGate": {
                                "status": "pass",
                                "actualRuntimeConfirmed": True,
                                "roleMenuExposureChecked": True,
                                "directRouteAccessChecked": True,
                                "logoutLoginAccountSwitchChecked": True,
                                "sessionRefreshAfterRoleChangeChecked": True,
                                "accountLifecycleChecked": True,
                                "dataReflectionChecked": True,
                                "viewerRuntimeChecked": True,
                                "placeholderDiagnosticUiAbsent": True,
                                "evidenceRefs": ["../outside.json"],
                            },
                            "riskAxisRegression": [
                                {"axis": "permission", "status": "pass", "evidenceRef": "_ops/evidence/OTHER/permission.json"},
                                {"axis": "session", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/session.json"},
                                {"axis": "accountLifecycle", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/account.json"},
                                {"axis": "dataReflection", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/data-reflection.json"},
                                {"axis": "viewerRuntime", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/viewer-runtime.json"},
                                {"axis": "productness", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/productness.json"},
                            ],
                            "reviewerProductQualityReview": {
                                "status": "pass",
                                "placeholderReviewPassed": True,
                                "diagnosticCopyReviewPassed": True,
                                "roleComponentReuseReviewPassed": True,
                                "staleSessionStateReviewPassed": True,
                                "dbUiStateMappingReviewPassed": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/reviewer-product-quality.json"],
                            },
                            "userUatEntry": {
                                "status": "ready",
                                "testerGatePassed": True,
                                "reviewerProductQualityPassed": True,
                                "p0p1E2EPassed": True,
                                "uatAccountsDefined": True,
                                "initialStateDefined": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/user-uat-entry.json"],
                            },
                        },
                    }
                },
                owner="planner",
                idempotency_key="pkt16-h10-bad-evidence",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
            ).validate_packet("PKT-16-H10-BAD-EVIDENCE")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("product_readiness_evidence_ref_untrusted", codes)

    def test_complete_planning_hardening_and_productization_contract_passes_pkt16_validators(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            _write_evidence_files(
                repo_root,
                [
                    "_ops/evidence/PKT-16/developer-done.json",
                    "_ops/evidence/PKT-16/tester-product-readiness.json",
                    "_ops/evidence/PKT-16/permission.json",
                    "_ops/evidence/PKT-16/session.json",
                    "_ops/evidence/PKT-16/account.json",
                    "_ops/evidence/PKT-16/data-reflection.json",
                    "_ops/evidence/PKT-16/viewer-runtime.json",
                    "_ops/evidence/PKT-16/productness.json",
                    "_ops/evidence/PKT-16/reviewer-product-quality.json",
                    "_ops/evidence/PKT-16/user-uat-entry.json",
                ],
            )
            store = HarnessStore(temp_dir)
            PacketService(store).create_packet(
                packet_id="PKT-16-PASS",
                title="Additional hardening and productization",
                objective="Make planning precise and implementation verifiable.",
                packet_type="harness-system",
                risk_class="high",
                change_zones=["_harness/system/standard_harness/validation/aggregator.py"],
                acceptance_criteria_ids=["AC-PKT16-H0"],
                evidence_requirements=["intent-fidelity", "projection-boundary", "clean-export"],
                closeout_criteria=["PKT-16 hardening rows are adjudicated."],
                closeout_plan={
                    "planningHardening": {
                        "intentSensitive": True,
                        "intentFidelity": {
                            "intendedOutcome": "Reduce LLM intent gap.",
                            "mustPreserveIntent": ["Precise planning", "Verifiable implementation"],
                            "nonGoals": ["Release approval"],
                            "forbiddenReinterpretations": ["Vocabulary-only conformance"],
                            "evidenceTargets": ["EV-PKT16-intent"],
                        },
                        "implementationConformance": {
                            "claims": [
                                {
                                    "intentSlice": "Precise planning",
                                    "acceptanceCriterionId": "AC-PKT16-H0",
                                    "evidenceRefs": ["_ops/evidence/PKT-16/intent.json"],
                                    "conformanceMode": "behavior",
                                }
                            ]
                        },
                        "requirementCandidates": [
                            {
                                "candidateId": "REQ-CAND-1",
                                "state": "promoted",
                                "canonicalRequirementId": "REQ-049",
                                "policyRef": "_harness/policies/planning-hardening.yaml",
                                "schemaRef": "_harness/schemas/packet.schema.json",
                                "validatorRef": "standard_harness.validation.aggregator",
                                "testRef": "_harness/test/test_pkt16_additional_hardening_productization.py",
                                "packetId": "PKT-16-PASS",
                                "evidenceTarget": "EV-PKT16-intent",
                            }
                        ],
                        "trace": {
                            "requirements": [
                                {
                                    "requirementId": "REQ-049",
                                    "features": [
                                        {
                                            "featureId": "FEAT-intent",
                                            "scenarios": [
                                                {
                                                    "scenarioId": "SCN-intent",
                                                    "acceptanceCriteria": ["AC-PKT16-H0"],
                                                    "evidenceTargets": ["EV-PKT16-intent"],
                                                }
                                            ],
                                        }
                                    ],
                                }
                            ],
                            "flows": [
                                {
                                    "flowId": "FLOW-intent",
                                    "roles": ["Planner", "Developer", "Tester", "Reviewer"],
                                    "stateChanges": ["candidate promoted"],
                                    "failurePaths": ["intent narrowed"],
                                    "evidenceTargets": ["EV-PKT16-intent"],
                                    "e2eApplicability": "not-needed",
                                }
                            ],
                        },
                        "projections": [
                            {
                                "projectionId": "prd-1",
                                "projectionOnly": True,
                                "authorityClaims": [],
                            }
                        ],
                        "endOfHardening": {
                            "broadHardeningClosed": True,
                            "futureWorkPolicy": "productization-or-narrow-defect-only",
                        },
                    },
                    "productizationHardening": {
                        "cleanExport": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/clean-export.json",
                            "forbiddenStateExcluded": True,
                        },
                        "installedRuntime": {
                            "status": "pass",
                            "evidenceRef": "_ops/evidence/PKT-16/installed-runtime.json",
                            "usedAsCleanExportProof": False,
                        },
                        "qaFreshness": {
                            "status": "pass",
                            "inheritedRootSourcesUsed": False,
                            "unsupportedBeforeProjectEvidence": True,
                            "authorityBoundaryRefused": True,
                        },
                        "promotionDryRun": {
                            "status": "pass",
                            "mutatesTarget": False,
                            "grantsReleaseApproval": False,
                            "reviewLanesAdjudicated": True,
                        },
                        "productReadinessBeforeUserUat": {
                            "applicability": "required",
                            "userFacing": True,
                            "userUatRequired": True,
                            "developerDone": {
                                "status": "implementation-complete-only",
                                "requirementImplementationChecked": True,
                                "unitApiTestsPassed": True,
                                "browserSmokePassed": True,
                                "placeholderDiagnosticSweepPassed": True,
                                "dbBackedRuntimeConfirmed": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/developer-done.json"],
                                "userUatReady": False,
                            },
                            "testerProductReadinessGate": {
                                "status": "pass",
                                "actualRuntimeConfirmed": True,
                                "roleMenuExposureChecked": True,
                                "directRouteAccessChecked": True,
                                "logoutLoginAccountSwitchChecked": True,
                                "sessionRefreshAfterRoleChangeChecked": True,
                                "accountLifecycleChecked": True,
                                "dataReflectionChecked": True,
                                "viewerRuntimeChecked": True,
                                "placeholderDiagnosticUiAbsent": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/tester-product-readiness.json"],
                            },
                            "riskAxisRegression": [
                                {"axis": "permission", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/permission.json"},
                                {"axis": "session", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/session.json"},
                                {"axis": "accountLifecycle", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/account.json"},
                                {"axis": "dataReflection", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/data-reflection.json"},
                                {"axis": "viewerRuntime", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/viewer-runtime.json"},
                                {"axis": "productness", "status": "pass", "evidenceRef": "_ops/evidence/PKT-16/productness.json"},
                            ],
                            "reviewerProductQualityReview": {
                                "status": "pass",
                                "placeholderReviewPassed": True,
                                "diagnosticCopyReviewPassed": True,
                                "roleComponentReuseReviewPassed": True,
                                "staleSessionStateReviewPassed": True,
                                "dbUiStateMappingReviewPassed": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/reviewer-product-quality.json"],
                            },
                            "userUatEntry": {
                                "status": "ready",
                                "testerGatePassed": True,
                                "reviewerProductQualityPassed": True,
                                "p0p1E2EPassed": True,
                                "uatAccountsDefined": True,
                                "initialStateDefined": True,
                                "evidenceRefs": ["_ops/evidence/PKT-16/user-uat-entry.json"],
                            },
                        },
                    },
                },
                owner="planner",
                idempotency_key="pkt16-pass",
            )

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=repo_root,
            ).validate_packet("PKT-16-PASS")
            codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertNotIn("missing_must_preserve_intent", codes)
        self.assertNotIn("projection_authority_claim_forbidden", codes)
        self.assertNotIn("clean_export_productization_evidence_missing", codes)
        self.assertNotIn("developer_done_cannot_approve_user_uat", codes)
        self.assertNotIn("tester_product_readiness_gate_missing", codes)
        self.assertNotIn("user_uat_entry_evidence_missing", codes)


def _write_evidence_files(repo_root: Path, refs: list[str]) -> None:
    for ref in refs:
        path = repo_root / ref
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('{"packetId":"PKT-16","status":"pass"}', encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
