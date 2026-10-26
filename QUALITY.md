# Quality and acceptance evidence — Gatherly 1.2

Reviewed on 26 October 2026 (IST). This is measured engineering evidence, not a
self-awarded competition score or a certification. The owner's latest supplied
external result is 96.72 overall: quality 88, security 99, efficiency 100,
testing 99, accessibility 99 and alignment 100. No deduction annotations were
supplied. [The final review](docs/FINAL_REVIEW.md) records the reproduced gaps,
changes and remaining verification. Earlier findings remain in the dated
[improvement audit](IMPROVEMENT_AUDIT.md) and [live baseline](LIVE_AI_AUDIT_2026-10-25.md).

## Reproduce the checks

Requires Node 24. Run `npm ci`, `NODE_ENV=production npm run check`, then
`npm audit --audit-level=moderate`. `check` includes formatting, type-aware ESLint,
strict TypeScript (including UI tests), the production build, asset budgets,
Node HTTP/domain/persistence tests and complete UI/component tests.

## Verified local results

| Check                            | Observed result                                                           |
| -------------------------------- | ------------------------------------------------------------------------- |
| Core tests                       | 114 passing Node tests                                                    |
| UI tests                         | 45 passing interaction, hook, recovery and axe tests                      |
| Core coverage                    | 97.88% lines, 93.68% branches, 93.94% functions                           |
| Complete UI coverage             | 88.80% lines, 87.41% statements, 81.87% branches, 85.19% functions        |
| Indexed-access / type-aware lint | Passed; maximum function complexity 20 enforced                           |
| Dependency audit                 | Zero known vulnerabilities across production and development dependencies |
| Initial JavaScript               | 372,629 bytes / 115,930 gzip in the recorded build                        |
| Stylesheet                       | 59,673 bytes / 12,777 gzip in the recorded build                          |

Core scope is server handlers/provider/allocation and loaded shared/domain/storage
modules; startup/dev entrypoints and browser hooks/client are excluded there.
The separate UI scope includes **all** components, nine pages, App, workspace,
service/model/planner/validation hooks, navigation and the typed API client. Only
the DOM mounting entrypoint `src/main.tsx` is excluded from that UI scope. Coverage
percentages describe different scopes and must not be averaged into a score.

Core gates: 95% lines, 90% branches and functions. UI gates: 85% lines/statements,
80% branches/functions. The previous 93% scoped UI line number covered only a
small subset and is not comparable with this complete UI measurement.

## Behavior exercised

- All three event types, preferences, exact AI allocations and bounded schemas.
- Create/edit event, navigation/search, budget, payment, task, vendor checks,
  guest/RSVP, idea, agenda and starter preview/create workflows.
- Atomic stale-write rejection, twenty-writer race, migration, blocked/closed
  database reopening, queued changes, explicit reload/replacement and storage failure.
- Corrupt, oversized and competing file imports; failed commit retains the
  candidate for retry; success is announced only after the database commits.
- AI consent/access controls, exact route selection, aborts, stale completion
  suppression, immutable preview context, upstream failures and StrictMode prompt handling.
- Schema errors focus and describe the affected field. Nine views and full shell
  pass structural axe checks; native dialog focus/trapping and boundary recovery are tested.
- Calendar CR/LF/Unicode escaping, unique scoped identifiers, valid date boundaries,
  safe Markdown/CSV exports and preservation of sensitive guest notes outside AI payloads.

## CI and deployment verification

CI retains LCOV core and HTML/JSON UI coverage artifacts for 14 days. It also runs
GitHub CodeQL's JavaScript/TypeScript security-and-quality suite with pinned
GitHub Action revisions and minimal permissions. A configured scan is not itself
a passing result; the final review records the actual run outcome.

Render builds run the same production-environment `check` command. The service
uses its existing automatic deployment from `main`; no secrets, pricing tier,
provider spending limits or stored workspace format were changed.

Real OpenRouter wedding/birthday/community acceptance from the previous deployed
release remains documented in [AI acceptance](docs/AI_ACCEPTANCE_2026-10-26.json).
That earlier evidence is not misrepresented as a new execution of this revision.
The final review distinguishes new deployed checks from historical checks.

## Limits

Automated accessibility does not certify screen-reader/device or full WCAG
compliance; JSDOM axe color contrast is disabled. Earlier responsive/contrast
browser checks are historical until explicitly repeated. CodeQL and advisory
scans do not prove absence of every vulnerability. There is no independent
penetration test or large-scale load certification. Plans remain browser-local
without account/cloud sync or encryption. No vendor booking, invitations or
payments occur automatically. A fresh PromptWars evaluation is needed to know
the new external score.
