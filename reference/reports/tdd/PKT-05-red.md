# PKT-05 TDD RED Evidence

- Command: `python -m unittest _harness.test.test_long_memory_question_answering`
- Cwd: `starter/standard-harness`
- Exit code: 1
- Expected failure kind: contract missing before implementation

```text
ModuleNotFoundError: No module named 'standard_harness.memory.question_answering'
```

The behavior-level question-answering/source-index contract test existed before the
production module.

## Remediation RED Evidence

After Human Owner review cancelled the previous closeout, additional tests were added
before remediation implementation for independent-review findings. The expected RED
failures covered these blocked behaviors:

- source discovery fanned out unrelated evidence refs instead of requiring direct evidence links,
- fake evidence refs were accepted when a repo root was known,
- wiki-proposal, PM, blocker, and active-context next-work source coverage was incomplete,
- packet-doc review accepted N/A and nonexistent evidence paths,
- closeout lens evidence paths were not verified,
- context packs and handoff prompts could include raw secret content,
- PEM private-key evidence was classified as `INTERNAL`,
- implementation workflow could start after approval without packet-doc review.

Representative RED command set:

```text
python -m unittest _harness.test.test_long_memory_question_answering
python -m unittest _harness.test.test_independent_review_governance
python -m unittest _harness.test.test_pkt05_security_and_transition_gates
```

Representative RED result: 8 expected failures across the three focused suites before
the remediation implementation.
