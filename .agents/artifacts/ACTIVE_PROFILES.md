# Active Profiles

## Purpose
This artifact declares optional profiles that are active for the current project or packet set. Profiles are explicit-only; a profile file existing under `reference/profiles/` does not activate it.

## Active Profile Table
| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |
|---|---|---|---|---|---|---|
| - | None currently active | - | not-needed | - | - | - |

## Activation Rule
- Declare a profile here before packets cite it as active.
- A packet that declares active profile dependencies must cite the matching profile reference and provide the required evidence.
- Evidence status may be `pending`, `approved`, `deferred-with-reason`, or `not-needed`.
- `Ready For Code` is blocked when a related active profile has missing or pending required evidence.
