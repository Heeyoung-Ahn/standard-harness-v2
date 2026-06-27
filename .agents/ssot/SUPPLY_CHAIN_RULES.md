---
doc_id: SUPPLY_CHAIN_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 900
---
# V2.4 Supply Chain Rules

Purpose: treat AI-tooling, dependency, lockfile, CI/CD, and package-manager changes as supply-chain surfaces.

## Dependency-sensitive surfaces

The dependency-sensitive overlay applies to:

- `package.json`, lockfiles, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`.
- `.github/workflows/**`, `Dockerfile`, and compose files.
- Any task that adds, removes, upgrades, or recommends packages.

## Required evidence

- Registry existence or offline allowlist decision.
- Lockfile review when a lockfile is present or changed.
- Install lifecycle script review for `preinstall`, `install`, `postinstall`, `prepare`, `prepublish`, `prepack`, and `postpack`.
- Package name safety check to reduce package hallucination and slopsquatting risk.
- Secret/token scan after tool, plugin, CI, or dependency changes.

## Stop condition

If registry verification, lockfile review, or lifecycle-script risk is missing, do not close the packet. Use `npm run harness:dependency-intake`.
