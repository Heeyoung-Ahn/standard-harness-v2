import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class HandoffSkillCliCommandTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "tools/harness_cli.py", "--json", *args],
            cwd=ROOT,
            check=False,
            text=True,
            capture_output=True,
        )

    def test_skill_route_command_is_implemented(self):
        result = self.run_cli(
            "skill-route",
            "--task-type",
            "test-driven-implementation",
            "--role",
            "developer",
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["route"]["requiredSkill"], "SKILL-TDD-IMPLEMENTATION")

    def test_handoff_prompt_command_is_implemented(self):
        result = self.run_cli(
            "handoff-prompt",
            "--task-type",
            "test-driven-implementation",
            "--role",
            "developer",
            "--packet-id",
            "PKT-XP07A",
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["handoff"]["selectedBy"], "skill-router")
        self.assertEqual(payload["handoff"]["evidenceClassification"], "MANUAL_ONLY")


if __name__ == "__main__":
    unittest.main()
