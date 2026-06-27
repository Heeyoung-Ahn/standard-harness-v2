# Standard Harness V2.1 Development Scenario

## Product Feature Packet Journey

1. Create a product-feature packet with scoped change zones, acceptance criteria, out-of-scope guardrails, and an explicit gate profile.
2. Write the test-first plan before implementation. The packet should identify unit, contract, browser/E2E, security, review, and refactor checks that apply.
3. Implement only the approved packet scope and record trusted evidence from harness-reproduced tests or trusted CI. Manual-only evidence can support context, but it cannot close code or runtime behavior.
4. Run E2E applicability, security review, requirements review, challenge review, and refactor gates when the packet type or risk profile triggers them.
5. Record supported claims against acceptance criteria, link evidence IDs, and record passing gate results before closeout.
6. If the work changes durable knowledge, create a wiki proposal and apply it only through the validated wiki path. SECRET or SENSITIVE evidence must not be promoted.
7. Generate handoff context through the harness so authority labels, token budgets, and stale context checks are preserved.
8. Emit a friction signal when workflow friction blocks progress, and emit a metric signal when validation, evidence, closeout, or handoff behavior is measured.
9. Run development validation:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --all --packet-id pkt-001
```

10. Run release conformance validation before packaging:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --v21-conformance
```

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --release
```

The intended release decision depends on complete HR coverage, executable validator catalog entries, challenge evidence, HR-200 metrics evidence, and tracked-file-only release packaging.
