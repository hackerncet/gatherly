# Gatherly final review

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

The complete local release checks have 115 passing core tests and 45 passing UI
checks. Full measurements and scope are in [QUALITY.md](../QUALITY.md). The core
coverage gate was raised to 95% lines/90% branches/90% functions. UI coverage
expanded from four modules to the complete application UI and hooks, with
85% line/statement and 80% branch/function gates. This broader scope prevents a
small selected coverage number from overstating application-wide confidence.

## External verification status

GitHub CodeQL and deployed acceptance will be recorded here after they complete.
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
Header regressions pass. Browser chart appearance still requires the post-deploy
check recorded below. A disconnected client observed while catalog loading cannot
start a subsequent provider generation; the HTTP regression waits for the server
to observe the closed connection rather than assuming the network disconnect is
instantaneous.
