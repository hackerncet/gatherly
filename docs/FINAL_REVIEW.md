# Gatherly 1.2 final review

Historical 1.2 release evidence. The latest maintainability upgrade is documented
in [CODE_QUALITY_REVIEW.md](CODE_QUALITY_REVIEW.md).

## Scope and scoring

The owner reported Code Quality 88, Security 99, Efficiency 100, Testing 99,
Accessibility 99 and Problem Statement Alignment 100 (overall 96.72).
Only scores were supplied. The evaluator's private rubric and deduction reasons
are unavailable, so the findings below are reproduced engineering gaps, not
claims about the exact causes of those scores. No local self-score replaces a
fresh external evaluation.

All existing event planning features, saved data formats and AI access controls
must remain available. Review covers every production source file, configuration,
test suite and current documentation; dependencies are checked through the lockfile
and advisory audit rather than a claim of reviewing every dependency line.

## Findings and implementation plan

| ID  | Criterion              | Evidence / risk                                                                                                 | Planned correction                                                                                                                                   |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Code quality           | App and Studio mix navigation, asynchronous operations, domain changes and large views (601 and 589 lines).     | Extract focused routing, workspace actions, model catalog, generation and preview components; preserve behavior and lazy loading.                    |
| Q2  | Code quality           | Lint is syntax-based; unchecked array indexes and redundant assertions hide missing values.                     | Type-aware lint and indexed-access checks, explicit invariants, schema-derived shared contracts.                                                     |
| Q3  | Code quality           | Domain module combines schemas, template content, dates and event operations.                                   | Separate modules with dependency direction and compatibility exports.                                                                                |
| Q4  | Code quality           | Quality documentation contains conflicting historical counts/configuration.                                     | Make the current evidence entry point unambiguous and retain dated historical records.                                                               |
| D1  | Security / reliability | IndexedDB blocked opens retain a rejected promise; version-change closes retain a closed connection.            | Retryable connection lifecycle, close late blocked handles, regression tests.                                                                        |
| D2  | Security / reliability | File read failures retain a previous incoming backup; concurrent reads can resolve out of order.                | Clear stale candidates, latest-read sequencing, explicit pending/success/failure states.                                                             |
| D3  | Reliability            | Selected model display can differ from submitted ID after catalog replacement.                                  | Reconcile selection atomically with a successful catalog response and test the submitted ID.                                                         |
| D4  | Reliability            | AI operations combine request lifecycle with catalog effects; stale/cancelled responses can update the preview. | Independent cancellation, latest-request protection, immutable generation context.                                                                   |
| S1  | Security               | Calendar escaping omits standalone carriage returns and UIDs can collide across record types.                   | Normalize every newline form and scope stable UIDs by event and record type.                                                                         |
| S2  | Security               | Exported Markdown includes raw user-supplied HTML/link syntax.                                                  | Escape untrusted Markdown fields while retaining readable text.                                                                                      |
| S3  | Security               | Production allowed unsafe-inline styles and had no explicit device capability policy.                           | Restrict styles to same-origin resources, deny style attributes/frames/base overrides and unused device APIs; retain trusted CSSOM progress updates. |
| A1  | Accessibility          | CRUD validation uses generic alerts without field association/focus; route announcements are incomplete.        | Shared accessible field validation, route title/focus handling and announced search counts.                                                          |
| A2  | Accessibility          | High-contrast preferences are not explicitly supported.                                                         | Forced-colors fallbacks and keyboard/zoom review.                                                                                                    |
| T1  | Testing                | Coverage gates exclude workspace/service hooks and most UI behavior.                                            | Cover persistence/conflict/recovery, cancellation, import races and CRUD workflows; report full UI coverage honestly.                                |
| D5  | Reliability            | Four-digit date boundaries could generate malformed task/calendar dates.                                        | Validate shifts, clamp earliest preparation tasks and export the final date without overflowing its year.                                            |
| T2  | Testing                | CI does not persist coverage artifacts; formatting is outside the local release command.                        | One reproducible release command and downloadable coverage evidence.                                                                                 |

## Verification protocol

For each change: reproduce or characterize the boundary, implement, run focused
regressions, then rerun type-aware lint, strict type checking, production build,
asset budgets, complete automated suites and dependency audit. Review the final
diff for regressions and verify the deployed UI/API and persistence flow. Record
observed results separately from remaining untested environments. Stop repeating
passing checks unless a new change or finding justifies another run.

## Implemented review outcomes

The listed corrections are implemented. The original data format and every
planning view remain available. App and Studio were reduced from 601/589 lines
to focused controllers (with rendering/request logic in named modules). Domain
schemas, template content, date handling and event commands have explicit
module boundaries. Provider handling is separated from Express application setup.
The compiler checks indexed access, implicit overrides and all UI test files.
Type-aware lint checks promises and enforces maximum cyclomatic complexity 20.

Additional review found decorative plus signs and suggestion numbers leaking
into accessible button names; those spans now remain visual decorations.
Generation previews retain the exact brief used for the request. Cancelling or
unmounting ignores late successes even when a mocked provider ignores abort.
The navigation prompt is read without side effects during StrictMode initialization.

The complete local release checks have 117 passing core tests and 45 passing UI
checks. Full measurements and scope are in [QUALITY.md](../QUALITY.md). The core
coverage gate was raised to 95% lines/90% branches/90% functions. UI coverage
expanded from four modules to the complete application UI and hooks, with
85% line/statement and 80% branch/function gates. This broader scope prevents a
small selected coverage number from overstating application-wide confidence.

## External verification status

Both implementation pull requests are merged:
[architecture, reliability and security improvements](https://github.com/hackerncet/gatherly/pull/1)
and [clearer accessible validation](https://github.com/hackerncet/gatherly/pull/2).
The deployed source is `25c830faa2a81d3d5b023bf2cb8e9ffad8aa1c72`.
[Main-branch CI 40273098096](https://github.com/hackerncet/gatherly/actions/runs/40273098096)
passed both release checks and the strict zero-findings CodeQL gate. Render
deployment `dep-dbfe33k9v7es73dc6iq0` became live on 26 October 2026 at 10:46 IST.
The [credential-free release record](RELEASE_VERIFICATION_2026-10-26.json) contains
the measured results and synthetic AI plans.
No new PromptWars result exists yet. Engineering checks and coverage are evidence,
not an invented 100/100 grade.

### Independent analysis and final security pass

The first GitHub review run [40270870343](https://github.com/hackerncet/gatherly/actions/runs/40270870343)
passed release checks and CodeQL analysis. Subsequent CI now additionally inspects
SARIF and fails on unresolved security or quality findings; the report is retained
as an artifact. Analysis completion alone is not equated with zero findings.

The final security pass removes unsafe-inline from CSP and explicitly denies
inline style attributes, embedded frames, base URL overrides and unused device
capabilities. React uses trusted CSSOM property assignments for numeric progress
styles; this behavior is described by [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr).
Header regressions pass. The deployed budget allocation widths and overview
progress ring rendered under the strict CSP in the real browser. A disconnected
client observed while catalog loading cannot
start a subsequent provider generation; the HTTP regression waits for the server
to observe the closed connection rather than assuming the network disconnect is
instantaneous.

The first SARIF gate run exposed a CI integration error: CodeQL's default output
was `../results`, while the gate expected `results`. The workflow now explicitly
sets `output: results`. The failed gate was not bypassed or counted as a clean
scan. GitHub Actions checkout/setup-node/artifact pins were also updated to the
verified current stable releases, removing Node 20 action deprecation warnings.

### CodeQL findings resolved without suppressions

The strict SARIF gate identified three results in run
[40271483611](https://github.com/hackerncet/gatherly/actions/runs/40271483611):

- `js/missing-rate-limiting`: file-serving routes now explicitly use a 180/minute
  per-IP limiter. Regression checks verify the 181st request is rejected and a
  health probe remains available.
- `js/insecure-helmet-configuration`: development no longer disables CSP. Vite
  now watches external build assets served by the same Express application.
  A spawned development-server check returned HTTP 200 for HTML, JS and CSS,
  with enforced CSP and no inline scripts or unsafe-inline allowance.
- `js/bad-tag-filter`: an HTML assertion in an export test used a regex that
  resembled an incomplete HTML sanitizer. It now checks exact string inclusion
  separately; production escaping remains unchanged.

No CodeQL rule was excluded, muted or accepted as a release exception. The next
[scan 40272123508](https://github.com/hackerncet/gatherly/actions/runs/40272123508)
passed with zero findings before merge. The final validation follow-up and
main-branch scan also passed with zero findings.

## Final deployed acceptance

- **Automation:** 117 core tests and 45 UI/hook/axe tests passed. Core coverage is
  97.89% lines, 94.57% branches and 94.03% functions. Complete UI coverage is
  88.82% lines, 87.43% statements, 81.71% branches and 85.19% functions. No
  coverage percentage is presented as 100%, and no denominator was reduced to
  obtain these results. The full dependency audit found zero known vulnerabilities.
- **Live AI:** wedding, birthday and community synthetic briefs each returned
  HTTP 200 from `openai/gpt-4.1-nano` through OpenRouter. Each response passed its
  schema, eight-task/three-idea requirements, exact INR 60,000 total and INR 6,000
  contingency checks. Access, vegan food, rain backup and sustainability
  preferences were reflected. Vendor suggestions remain generic requirements,
  without invented contacts or actual bookings. These calls ran against commit
  `2c1cd2ce0cdf9ac07f0b499245a42839ecbc429b`; the final follow-up changed frontend
  validation text only, leaving the tested backend identical.
- **Persistence:** exported the workspace before the upgrade and again after
  the final deployed reload. Schema validation and deep equality confirmed all
  six events, every field and the selected event were preserved exactly.
- **Browser workflows:** all nine views loaded with correct page titles and no
  horizontal document overflow at the recorded desktop viewport. A blank budget
  category focused its field and announced the associated error. Final wording
  is “Please check Category: This field cannot be blank.” Cancelling restored
  the opener and wrote no category.
- **Exports:** actual browser calendar and event-brief downloads completed.
  Markdown exactly matched the selected saved event; calendar matched after
  normalizing its creation timestamp, contained nine entries and respected
  75-byte UTF-8 line folding.
- **Security:** live health reported 1.2.0, strict CSP without unsafe-inline or
  unsafe-eval, denied unused device capabilities and no-store API responses.
  Invalid synthetic AI access returned 401; `/.env` returned 404. The sampled
  post-deploy application error logs were empty. No API key or private owner
  access code was changed or included in this evidence.

Only the recorded model and three synthetic briefs were tested with a real
provider. Automated axe checks exclude JSDOM color contrast; there is no physical
device, screen-reader, penetration-test or large-scale load certification.
The attempted zoom shortcut had no observable effect and is not counted as a
successful zoom test. Data remains browser-local without accounts or cloud sync.
These boundaries are retained explicitly for review. A fresh external PromptWars
evaluation is required to establish the new competition score.
