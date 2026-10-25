# Gatherly 1.1 — findings, implementation and verification

Date: 25 October 2026. The owner's external evaluation was 93.51/100: Code Quality 86, Security 98, Efficiency 100, Testing 98, Accessibility 96, Problem Statement Alignment 93. No private evaluator rubric or deduction annotations were supplied. Findings below are independently demonstrated engineering issues and improvements, not invented explanations of that scorer's decisions.

The original analysis and implementation order were written before changes in [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md).

## Findings and changes

| Finding | Change | Evidence / acceptance |
| --- | --- | --- |
| Shared and server JavaScript bypassed strict checking; types duplicated runtime contracts | Migrated production code to strict native TypeScript; derive event/plan/item types from Zod schemas; separate provider, API client, repository and UI hooks | Strict type check across src/server; no explicit any or ts-ignore suppression |
| Stale tabs silently overwrote whole workspaces | IndexedDB read/write transactions compare revisions atomically; migration preserves records; stale writes abort | Two independent readers and a 20-writer race: exactly one succeeds at the same revision |
| An open form could be replaced by a newer tab snapshot | Keep drafts in place, stop background saves and offer export/reload recovery | Real two-tab browser test retained the first draft and the second committed edit independently |
| Valid 1,600-character preferences generated a summary outside the response contract | Bound starter summaries and parse every generated starter with the shared plan schema | Maximum-input regression test passes |
| Starter ideas ignored preferences | Add specific access, dietary, weather and sustainability ideas and tasks | Four preference families independently tested |
| AI plans could omit contingency or leave totals unexplained | Require exact allocation and an explicit contingency/reserve/buffer category | Under-budget, over-budget and missing-contingency outputs rejected |
| Vendor selection guidance was absent from generated plans | Add generic vendor categories and requirements; create unchecked shortlist entries with zero quoted amounts | Tests confirm no invented contacts, quotes or bookings |
| Requested model route was the only model identity shown | Capture provider-reported model when available; persist starting source/model/date | Actual-model envelope test; visible Event guide provenance |
| Upstream responses were read before size checks | Enforce byte caps while streaming and cancel rejected bodies | Oversize completion/catalog, declared-size and split-Unicode tests |
| A consent checkbox alone did not protect direct API callers | Server also requires explicit consent for authenticated live generation | No-consent request is denied before provider submission |
| Silent health failures and opaque AI setup state | Typed API contracts, retry control and non-secret key/code readiness flags | Health/auth/privacy tests; no credential values in diagnostics |
| No component/keyboard/axe tests or coverage gate | Add Vitest, Testing Library, axe-core and instrumented Node tests; enforce separate core/UI coverage thresholds | Complete check command and CI run all gates |
| Invalid chart ARIA and skipped empty-state heading | Give the budget graphic an image role and fix heading hierarchy | axe checks across all nine views pass; color contrast tested separately |
| Autofocus and modal opener handling needed consistency | Use the native dialog focus lifecycle, remove autofocus attributes and fix opener capture | Forward/backward Tab wrap and opener restoration test |
| Global page recovery could only reload | Add a page boundary that retains the live workspace and offers backup/navigation/reload | Simulated render-failure component test |
| Organizers had no consolidated event-day view | Add editable event-day agenda with responsible team, planning insights, iCalendar export and a shareable brief | Add/edit/delete/export component flow, calendar escaping and Unicode-folding tests |
| Browser testing found the new time input could display a changed value without saving it | Read validated native FormData on schedule submission instead of relying on a controlled change event | Browser retest stored 15:30 exactly; regression assertion added |
| Backups/exports needed portability and lifecycle handling | Attach download anchors to the document, reclaim object URLs, preserve version-1 backup compatibility | Exported first-tab draft parsed successfully with its 15:30 agenda time |

## Verification loop and results

1. Baseline: 54 tests/build/format/audit passed, while the stale-save, maximum-summary and unchanged-ideas defects were independently reproduced.
2. Implementation: introduced strict contracts, transaction persistence, relevant planning features and resilience controls.
3. Automated review found two structural accessibility failures. Both were corrected; no axe rules were disabled except color contrast, which JSDOM cannot reliably calculate.
4. Browser review found the native time-entry edge case. The form was simplified, a regression assertion added, and the actual browser save retested.
5. Real multi-tab workflow: a first-tab draft remained exportable after a second tab saved. Loading the newest workspace retained the second tab's change. The downloaded backup independently contained the first draft and its correct time.
6. Re-run all checks after the fixes, deploy, verify public health/UI/runtime logs, then document actual provider acceptance separately.

Latest complete local run: **84 Node tests + 18 component/axe tests = 102 passing tests**, with lint, strict types, production build, asset budgets, formatting and full dependency audit passing. The dependency audit reported **zero known vulnerabilities** at this check.

The latest core coverage report (server, domain, planning, repository and legacy storage utilities) was **97.29% lines, 92.00% branches, 89.90% functions**. The component coverage gate measures EventForm, Guide, DownloadLink and the typed client; it is not presented as coverage of every UI line. All nine views have structural axe tests. Core minimums are 85% lines/functions and 75% branches. Component minimums are 80% lines/statements/functions and 70% branches. Coverage is bounded evidence, not a competition score.

The measured initial JavaScript is 369,359 bytes / 114,458 bytes gzip; CSS is 59,034 bytes / 12,580 bytes gzip. The initial JavaScript remains under the existing 400 KB / 125 KB gzip limit; CSS remains under 75 KB / 16 KB gzip. Secondary views, including Event guide, load on demand. There are no additional runtime UI libraries or hosted database costs.

## Deployment and AI acceptance

Source: https://github.com/hackerncet/gatherly

Application: https://gatherly-qx5g.onrender.com/

Deployment verification for this revision is recorded below after it becomes live. Earlier baseline health reported AI disabled. New health diagnostics distinguish a missing/placeholder key from a missing/placeholder private access code without exposing values. A configured flag alone is not proof that OpenRouter authenticated or generated a valid plan. Real-provider completion must return source=ai, a model identity and a plan that passes exact-budget and schema checks before it is reported as verified.

## Additional review findings

- The complete application shell exposed two more axe failures: a prohibited name on an empty focus placeholder and duplicate complementary landmarks. Navigation now focuses the actual main landmark; sidebars have distinct names. The full-shell axe regression passes.
- Migration now preserves and exposes a different older-format snapshot instead of deleting edits saved by a still-open older application. A regression test confirms the differing snapshot remains exportable and the current database is not replaced.
- Provider authentication failures return an actionable, redacted owner message rather than a generic failure.
- Calendar and event brief exports now use native download links with object-URL cleanup. Calendar bytes, escaping, Unicode line folding and link semantics pass tests. The cloud browser did not report calendar/Markdown download completion, so browser-level capture of those two file types remains unverified; this is not counted as a passed download test.

## Practical limits

- No new external competition score has been issued in this audit. Only the external evaluator can establish whether the revised submission exceeds 98/100.
- Screen-reader and physical-device certification, large-scale load testing and an independent penetration test are not claimed.
- Plans remain browser-local and unencrypted within the browser profile. This release adds safe same-browser tab coordination, not cloud collaboration or account authentication.
- AI limits remain per process and reset on restart. A provider-side spending cap remains necessary for monetary limits.
- Vendor entries, payments and RSVPs are organizer records. The app does not contact, book or pay third parties.
