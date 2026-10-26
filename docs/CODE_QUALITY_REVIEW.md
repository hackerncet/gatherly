# Gatherly 1.3 code quality review

Reviewed 26 October 2026 (IST). This release follows the owner's request for a
further code quality improvement after the verified 1.2 release. Findings are
reproduced engineering gaps; the private PromptWars rubric and deduction reasons
are unavailable. This document does not assign a replacement competition score.

## Findings and corrections

| Finding                                                                                                                                                                 | Resulting implementation                                                                                                                                                                                           | Verification                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| The application returned update success/failure, but page props erased that result as `void`. Forms and confirmations could close and announce success after rejection. | A discriminated `CommandResult` crosses the application boundary. Editors retain their fields and show an alert on rejection. Confirmation closes only after acceptance.                                           | Rejected save and retry workflows for all six editors; rejected deletion and inline-update checks.               |
| Pages constructed whole event snapshots from render-time props. Two independent commands could replace each other's unrelated edits.                                    | `UpdateEvent` accepts a pure function, bound to the intended event ID and applied to the latest workspace. Record changes retain unrelated event data and event identities.                                        | Independent budget/guest changes, repeated task changes, missing-event and identity-change regressions.          |
| Budget, vendor and guest forms used `record \| null \| false`; task editing used separate adding/editing flags; agenda inferred create/edit from record existence.      | One explicit closed/create/edit state controls six editors. Missing edits fail instead of silently disappearing or recreating removed records.                                                                     | Existing create/edit/cancel/delete workflows and stale-identity checks.                                          |
| Six page modules duplicated parsing, error blocks, modal actions, ID replacement and collection capacities.                                                             | Focused Budget, Task, Vendor, Guest, Idea and Agenda editors share `RecordEditor`; pure typed record commands own collection mutations. Schema validation and commands use the same limits.                        | Boundary tests for every collection at exact capacity; duplicate IDs and stale removals rejected.                |
| Model and event enums were declared separately from runtime contracts.                                                                                                  | `Model` derives from `modelSchema`; event type and currency derive from `Brief`. Optional properties and type-only imports have compiler/lint enforcement.                                                         | Strict TypeScript across production and UI tests, including exact optional properties and explicit return paths. |
| Broad domain/UI entry points obscured ownership.                                                                                                                        | Production imports use owning domain modules directly. Native modal, confirmation, botanical artwork, logo and toast each have a focused component.                                                                | Zero production domain-barrel imports; all existing views and dialog interaction tests retained.                 |
| Dependency direction and runtime cycles had no automated enforcement.                                                                                                   | An AST-based architecture gate resolves static/lazy dependencies, rejects browser-to-server/Node imports, UI-to-library inversions, unresolved local modules and runtime cycles. Type-only edges remain permitted. | Negative architecture fixtures and the complete production-module scan run in `npm run check`.                   |
| Every toast displayed a success check, including rejected operations.                                                                                                   | A dedicated notification hook owns timer cleanup; presentation distinguishes error and success with icon and live-region behavior.                                                                                 | Error announcement, latest-message lifetime and unmount cleanup tests.                                           |
| Browser capability types assumed IndexedDB and randomUUID were always available.                                                                                        | Optional capability contracts preserve the actual storage-unavailable and secure UUID fallback paths without assertions or condition suppressions.                                                                 | Existing storage recovery and cryptographic fallback regressions; unnecessary-condition lint.                    |

The six planning page modules now total 1,112 lines, down from 1,818. The removed
page-level form plumbing is owned by focused editors and shared commands rather
than being omitted from the application.

## Architecture and change protocol

`App` binds an event ID to the latest workspace and returns a command outcome.
Pages describe the intended change. `useEventRecords` controls editor mode and
success notifications; domain commands validate identity and capacity while
workspace schemas validate the resulting event/workspace. `RecordEditor` reads
native form values, associates validation with the affected field and closes only
when its command is accepted. Record-specific components own their fields.

Command acceptance updates the in-memory workspace and queues persistence. It is
not a claim that an IndexedDB transaction has already committed. The existing
saved/saving/unsaved status and recovery banner remain the persistence authority.
Revision-checked IndexedDB transactions continue to protect against stale tabs;
failed saves preserve the current edits for export. Backups and version-1 saved
records retain the same schema and capacity limits.

Import rules are checked from resolved TypeScript dependencies, including literal
lazy imports. Runtime dependency cycles are rejected. Server modules may import
shared library modules; reusable components cannot depend on page modules except
the explicit `WorkspacePages` composition point. Shared library code cannot
import views. External packages remain subject to lockfile/audit checks.

Compiler additions are `noImplicitReturns`, `verbatimModuleSyntax`,
`exactOptionalPropertyTypes` and consistent file casing. Existing strict and
indexed-access checks remain. Type-aware lint additionally checks consistent
type imports, unnecessary conditions and strict equality; complexity remains
capped at 20. No quality threshold or CodeQL rule was weakened to obtain passing checks.
All new UI modules remain in the coverage scope; executable line counts changed
with the refactor.

## Measured local results

`NODE_ENV=production npm run check` completed successfully: formatting,
architecture boundaries, type-aware lint, strict types, production build, asset
budgets, **127 core tests and 55 UI tests (182 total)**. No tests were skipped or
cancelled. The dependency audit reported zero known vulnerabilities across
production and development packages. The new failure-path checks exercise behavior rather than snapshots.

Core coverage is **97.76% lines, 95.01% branches, 93.84% functions**. Complete UI
coverage is **91.21% lines, 90.55% statements, 84.72% branches, 89.55% functions**.
The UI scope still includes all components/pages/hooks/App/client and excludes
only the mounting entry point. Its previous line measurement was 88.82%; the
broader retained scope makes this comparison meaningful. Core and UI percentages
measure different scopes and are not averaged into a score.

Initial JavaScript is **374,727 bytes / 116,732 bytes gzip**; CSS remains
**59,673 bytes / 12,777 bytes gzip**. Both remain inside the existing enforced
budgets. Secondary pages and their record-specific editor fields remain lazy loaded. No new runtime
package, database service or paid infrastructure was added.

## Release verification

The implementation is prepared on `improve/code-quality-architecture` for GitHub
CI's production checks and independent zero-findings CodeQL gate, then the
existing Render automatic deployment and browser/API verification. Actual
release identifiers and observations will be recorded after completion.

The last paid real-provider acceptance matrix belongs to 1.2; it is retained in
[the earlier release record](RELEASE_VERIFICATION_2026-10-26.json). This refactor
keeps the planning/allocation contracts and access controls, with mocked-provider
regressions running in the current suite. It does not claim a new paid-model
execution or that every OpenRouter model was tested.

Automated accessibility checks do not establish physical device/screen-reader or
full WCAG certification. Browser-local storage, vendor booking and cloud-sync
boundaries remain documented in [SECURITY.md](../SECURITY.md). A fresh PromptWars
evaluation is required to establish an external score for this release.
