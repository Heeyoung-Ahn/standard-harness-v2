# PRF-05 Python/Django Backoffice Profile

## Purpose
Use this optional profile when the project builds an internal backoffice web application with Python and Django. The profile provides implementation convention evidence without forcing one universal Django version or one product directory layout.

## Approval Rule
- Activate this profile explicitly before Python/Django implementation packets claim `Ready For Code`.
- The project must declare its product source root and test root.
- Core must not pin one Django version for all projects; each project records its supported-version/security-support rationale.
- Project-specific models, apps, permissions, admin screens, settings values, deployment paths, and database names stay in project packets.

## 1. Activation Trigger
- The product runtime is Python/Django.
- The project implements Django apps, migrations, admin/backoffice screens, auth/permission logic, or DB-backed services.

## 2. Version Policy Evidence
- Python version policy:
- Django version selection policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Lockfile policy:

## 3. Architecture Evidence
- Product source root:
- Product test root:
- Django project/module boundary:
- Django app / module boundary:
- Settings / environment policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Static / media / admin customization boundary:

## 4. Migration And Test Evidence
- Migration policy:
- Backward/forward compatibility rule:
- Data migration approval boundary:
- Test convention:
- Fixture/factory policy:
- Management command policy:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Python / Django version policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Django app / module boundary:
- Settings / environment policy:
- Migration policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Test convention:
- Static / media / admin customization boundary:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Cite this profile in `Active profile references`.
- Cite the project convention artifact that records version, source-root, app boundary, migration, DB, and testing policy.
- Do not approve `Ready For Code` when the product source root or migration policy is still unknown.
