# Troubleshooting

| Symptom | Likely cause | Recovery |
|---|---|---|
| Node version block | Runtime is below Node 24 | Use Node 24 or the devcontainer, then rerun `npm test` |
| Starter/bootstrap pending | Project has not been initialized | Run `npm run harness:init` |
| `codex-ready` HOLD | Missing active packet, profile, or evidence | Read the dashboard next action, then run the relevant hard gate |
| Implementation transition blocked | Ready For Code or packet metadata missing | Update the packet, then run `npm run harness:packet-preflight -- --stage implementation-transition --packet <packet-path> --work-item <work-item-id>` |
| Browser strict audit blocked | Static-only or missing browser evidence | Run Codex Browser validation, intake evidence, then rerun `npm run browser:evidence:audit -- --packet <packet-path> --work-item <work-item-id> --strict` |
| Wrong packet evidence | Manifest `packet_path` does not match closeout packet | Regenerate or edit the manifest through `npm run browser:evidence:intake` with the correct `--packet` |
| Drift detected | SQLite/generated docs/ACTIVE_CONTEXT mismatch | Follow `reference/manuals/operator/DRIFT_RECOVERY_RUNBOOK.md` |
| Missing documented command | Manual references a script not in `package.json` | Run `npm run docs:commands:check` and update either docs or scripts |
