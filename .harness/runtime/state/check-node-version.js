const requiredMajor = 24;
const actual = process.versions.node;
const actualMajor = Number.parseInt(actual.split(".")[0], 10);

if (!Number.isInteger(actualMajor) || actualMajor < requiredMajor) {
  process.stderr.write([
    `Standard Harness V2.8 requires Node.js ${requiredMajor}+ for official runtime/test execution; current Node.js is ${actual}.`,
    "This is a normal protective block, not a test failure.",
    "Use one of the canonical execution surfaces before running official validation:",
    "- nvm use 24",
    "- devcontainer: .devcontainer/devcontainer.json",
    "- CI: .github/workflows/v28-official-validation.yml",
    "Then rerun: npm test"
  ].join("\n") + "\n");
  process.exit(1);
}

process.stdout.write(`Node.js runtime check passed: ${actual}\n`);
