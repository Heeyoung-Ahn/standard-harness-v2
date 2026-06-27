# Optional Profiles

This folder contains reusable optional profile packages that extend the standard harness only when they are explicitly activated.

## Rule

- Nothing in `reference/profiles/` is part of the default constitutional load order.
- Read a profile only when `Active Profile Selection` explicitly activates it and the active task depends on that profile.
- When a profile is active, the task packet must cite the profile reference path and record the required profile-specific evidence.
- CLI initialization accepts only short profile IDs such as `PRF-10`, `PRF-9`, or `PRF-10,PRF-9`. Full profile filenames are citation paths, not `--profiles` values.

## Current Profiles

- `PRF-01_ADMIN_GRID_APPLICATION_PROFILE.md`: grid-heavy administrative application profile
- `PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md`: spreadsheet-backed authoritative source profile
- `PRF-03_AIRGAPPED_DELIVERY_PROFILE.md`: transfer-bound or airgapped delivery profile
- `PRF-04_LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE.md`: legacy Excel/VBA-MariaDB business-system replacement profile
- `PRF-05_PYTHON_DJANGO_BACKOFFICE_PROFILE.md`: Python/Django backoffice profile
- `PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE.md`: workflow, approval, permission, and audit-heavy application profile
- `PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md`: lightweight web/app profile for small apps and simple internal tools
- `PRF-08_ANDROID_NATIVE_APP_PROFILE.md`: Android native app profile for Gradle, signing, permissions, device test, and release boundaries
- `PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md`: Node/frontend web app profile for package ownership, build, test, environment, API, and deploy boundaries
- `PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md`: BI/analytics platform profile for source inventory, semantic model, metric catalog, refresh/lineage, and dashboard governance
