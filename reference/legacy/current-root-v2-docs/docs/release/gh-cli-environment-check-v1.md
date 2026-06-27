# GitHub CLI Environment Check v1

## Purpose

This document records how maintainers verify GitHub CLI availability after installation.

## Windows Check

Run:

```powershell
gh --version
```

If the current shell does not see `gh`, run:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" --version
```

Open a new PowerShell session after installation so PATH changes are loaded.

## Authentication Check

Run:

```powershell
gh auth status
```

Expected:

```text
Logged in to github.com
```

If authentication is missing, run:

```powershell
gh auth login
```

Choose GitHub.com, HTTPS, and browser authentication.

## Push Check

Run:

```powershell
git remote -v
git push
```

Expected remote:

```text
origin https://github.com/Heeyoung-Ahn/standard-harness-v2.git
```

## Observed Local Environment

Observed during release-quality closeout:

```text
gh is not available on PATH.
"C:\Program Files\GitHub CLI\gh.exe" exists.
"C:\Program Files\GitHub CLI\gh.exe" --version -> gh version 2.95.0 (2026-06-17)
"C:\Program Files\GitHub CLI\gh.exe" auth status -> You are not logged into any GitHub hosts.
```

Remote issue creation, push verification, and GitHub Actions UI verification require `gh auth login` or equivalent maintainer authentication.
