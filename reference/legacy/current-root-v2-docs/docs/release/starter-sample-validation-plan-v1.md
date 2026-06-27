# Starter Sample Validation Plan v1

## Goal

Validate that `starter/standard-harness/` can seed a separate project without copying development artifacts.

## Sample Location

Use:

```text
C:\tmp\standard-harness-sample
```

## Commands

Create a clean sample directory:

```powershell
New-Item -ItemType Directory -Force C:\tmp\standard-harness-sample
Copy-Item -Recurse starter\standard-harness\* C:\tmp\standard-harness-sample\
```

Run starter check against the copied sample root before initializing state:

```powershell
python C:\tmp\standard-harness-sample\_harness\bin\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample starter-check --root C:\tmp\standard-harness-sample
```

Expected:

```json
{"status":"ok","starter":{"status":"ok","diagnostics":[]}}
```

Initialize harness state in the sample after the copied payload is proven clean:

```powershell
python C:\tmp\standard-harness-sample\_harness\bin\harness_cli.py --json --harness-root C:\tmp\standard-harness-sample init
```

## Evidence to Record

- Copy command completed.
- `starter-check --root` returned JSON status `ok`.
- `starter-check --root` verified README.md and START_HERE.md exist in the sample root.
- No `.git`, `.agents`, `.codex`, `__pycache__`, logs, local evidence, or development `.harness/state/harness.sqlite3` from the development repository were copied.
- `init` returned JSON status `ok`.

## Observed Results

- Recreated `C:\tmp\standard-harness-sample` as a clean directory.
- Copied `starter/standard-harness/*` into the sample directory.
- Before initialization, `starter-check --root C:\tmp\standard-harness-sample` returned:

```json
{"starter": {"diagnostics": [], "status": "ok"}, "status": "ok"}
```

- Before initialization, `C:\tmp\standard-harness-sample\.harness\state\harness.sqlite3` did not exist.
- After the copied payload was proven clean, `init` returned:

```json
{"harness_root": "C:\\tmp\\standard-harness-sample", "source_watermark": 0, "state_db": "C:\\tmp\\standard-harness-sample\\.harness\\state\\harness.sqlite3", "status": "ok"}
```
