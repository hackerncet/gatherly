# Gatherly — live AI readiness and six-criterion audit

Audit date: 25 October 2026. Code reviewed: `cfadc85b4b691ed0f6d2f97b5ded0e58597c04b1`.

Application: https://gatherly-qx5g.onrender.com/

## Result

The planning application is live and its automated checks pass, but **real OpenRouter generation remains blocked by configuration**. The current health response reports `aiEnabled: false`. All three live planning requests returned `source: "template"` and `model: null`. This audit therefore does not claim that the newly supplied OpenRouter key is authenticated or that a real model completion passed.

A separate data-integrity defect was reproduced with isolated workspace copies: a later save from a stale copy can overwrite changes from another tab. The audit did not change application code, credentials or security settings.

## Findings

### 1. Live AI is not enabled — blocks GenAI acceptance testing

The activation condition in [server/app.mjs](https://github.com/hackerncet/gatherly/blob/cfadc85b4b691ed0f6d2f97b5ded0e58597c04b1/server/app.mjs#L64) requires:

- A nonempty, non-dummy `OPENROUTER_API_KEY`.
- A nonempty, non-dummy `AI_ACCESS_CODE` of at least 16 characters.

At least one check is currently failing. Secret values were not read or exposed, so this report does not assert which value is missing. Since the owner reported updating the router key, verify the private access-code setting first, then choose **Save and deploy** in Render and reload the app.

The live model catalog works without validating the application's private provider key; seeing 467 models is not evidence that authenticated generation works.

After activation, enter the private access code in AI Studio and run limited real-model checks for all three event types. Validate `source: "ai"`, the returned model, JSON structure, budget totals, usable dates, personalization, accessibility/dietary considerations and failure/cancellation behavior. These real-provider checks are pending.

### 2. Stale workspace saves can overwrite newer edits — medium severity

[App.tsx](https://github.com/hackerncet/gatherly/blob/cfadc85b4b691ed0f6d2f97b5ded0e58597c04b1/src/App.tsx#L84) persists the whole current workspace after a state update. [saveWorkspace](https://github.com/hackerncet/gatherly/blob/cfadc85b4b691ed0f6d2f97b5ded0e58597c04b1/src/lib/storage.ts#L110) replaces the complete localStorage value without cross-tab revision/conflict handling.

Isolated reproduction, using an in-memory storage fixture and no user records:

1. Save an initial workspace, then load independent copies A and B.
2. Add a task to A and save it.
3. Record a payment in stale copy B and save it.
4. Reload the stored workspace.

Observed result: B's payment remains, while A's new task is absent. The 54-test regression suite currently does not test this scenario.

Recommended correction: serialize cross-tab persistence, detect stale revisions and provide a reload/merge conflict flow instead of silently replacing newer data. Add a regression test covering two independent copies and real browser-tab synchronization. Until corrected, edit a workspace in one tab at a time.

## Six requested parameters

| Parameter                   | Verified evidence                                                                                                                                                                          | Remaining gap                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Code Quality                | Strict TypeScript build, formatting and all 54 tests passed; frontend/domain/API separation and shared schemas reviewed                                                                    | Cross-tab lost-update defect; shared/server JavaScript is runtime-validated but not covered by TypeScript `checkJs`                     |
| Efficiency                  | Initial JS: 357,274 bytes / 110,573 bytes gzip; CSS: 57,942 bytes / 12,354 bytes gzip; asset budgets passed; lazy routes and cached/deduplicated model catalog                             | No load test or valid p95 latency series; observed request round trips include network/proxy time                                       |
| Accessibility               | All eight live views loaded with zero visible-text contrast failures in this check; no document-level horizontal overflow at the desktop viewport                                          | Physical devices and screen readers not tested; earlier 24 responsive-frame checks apply to this unchanged code revision                |
| Security                    | CSP, HSTS, no-store API policy and nosniff observed; access-code, origin, validation, rate/concurrency/daily-limit tests passed; full dependency audit reported zero known vulnerabilities | Per-process limits reset on restart; browser data is not account-protected/encrypted; not an independent penetration-test certification |
| Testing                     | 54 automated tests, build, format and asset checks passed again; eight live views produced no application-origin console errors; three live starter API requests checked                   | Actual provider completion, prompt quality and provider-specific behavior remain unverified; multi-tab persistence coverage is missing  |
| Problem Statement Alignment | Wedding, birthday and community planning routes returned exact budget allocations, task timelines and ideas; budget/vendor/guest/inspiration UI views loaded                               | The central live GenAI capability is not currently active, so full live acceptance is incomplete                                        |

## Live request evidence

All requests used synthetic event briefs with a 60,000 INR budget, 40 guests, vegetarian/accessibility preferences and a bad-weather request. No personal guest list or vendor contact data was submitted.

| Event type | HTTP | Source   | Model | Allocated total | Tasks | Ideas |
| ---------- | ---- | -------- | ----- | --------------- | ----- | ----- |
| Wedding    | 200  | template | null  | 60,000 INR      | 9     | 3     |
| Birthday   | 200  | template | null  | 60,000 INR      | 8     | 3     |
| Community  | 200  | template | null  | 60,000 INR      | 8     | 3     |

Observed end-to-end request durations were approximately 9.23, 6.12 and 5.84 seconds respectively. These measurements include client/network/proxy overhead and are not a server-only or p95 performance result.

Render reported the latest manual deployment as live, using the reviewed code commit. Sampled memory on the current instance was about 71–75 MiB against a 512 MiB limit. HTTP latency metrics returned no data. No application error logs were returned by the queried error-log filter; that is not proof that no errors can occur.

A source/client-asset scan found no application `dangerouslySetInnerHTML` or `eval` use and no key matching the checked OpenRouter token pattern in compiled client assets. Framework internals are not treated as application injection sinks. This scan does not prove the absence of every possible secret or vulnerability.

## Scoring and scope

No numeric score is assigned. Passing checks provide bounded evidence, not a 100% competition score or security/accessibility certification. The AI activation blocker and cross-tab data-integrity issue must remain visible in an honest evaluation.
