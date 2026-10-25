# Quality and acceptance evidence

**Latest improvement cycle:** [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md). The historical results below describe the earlier deployed revision. The latest implementation replaces localStorage writes, adds full production TypeScript checking, 102 tests and component/axe/coverage gates.

Checked on 25 October 2026. This report records tested behavior, not a claim of perfection or certification.

For the latest readiness check and newly reproduced findings, see [LIVE_AI_AUDIT_2026-10-25.md](LIVE_AI_AUDIT_2026-10-25.md). Live AI remains disabled in that check, and a cross-tab lost-update issue is documented there.

| Requested parameter | Implemented acceptance criteria                                                                                                                                             | Evidence                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Code quality        | Strict TypeScript, separated domain/API/UI layers, versioned data schemas, consistent formatting, documented boundaries                                                     | `npm run build`; Prettier; focused source modules                              |
| Efficiency          | One small Node service, static assets with cache headers, no database dependency, no third-party UI assets, deduplicated/cached model catalog, bounded concurrency/timeouts | Production build; model-cache and timeout tests                                |
| Accessibility       | Semantic navigation and tables, labeled inputs, visible focus, native dialog trapping/Escape, non-color status text, skip link, reduced motion, responsive CSS              | Browser inspection and interaction checks; contrast review                     |
| Security            | Server-only key, separate access code, minimal AI payload, structured validation, origin checks, bounded requests, strict CSP, protected import/export                      | API and domain regression tests; production dependency audit                   |
| Testing             | HTTP integration and domain tests covering positive, negative and provider failure paths; real-browser workflow review                                                      | `npm test`; browser checklist below                                            |
| Problem alignment   | Weddings, birthdays, community events; budgets, timelines, vendors, personalized ideas                                                                                      | Three valid starter templates; end-to-end birthday creation; AI Studio preview |

## Automated results

- 54 domain, persistence and HTTP integration tests passed on the final test run.
- Strict TypeScript check and production build passed.
- `npm audit --omit=dev --audit-level=moderate`: zero known vulnerabilities reported for production dependencies at that check.
- Each event type receives a complete valid starter plan; allocations sum exactly to the budget, including at tiny/uneven values.
- Invalid dates, non-integer or negative budgets, invalid guest counts and oversized inputs are rejected.
- Tests verify access-code enforcement, cross-origin denial, response headers, model catalog caching/filtering/fallback, provider redaction, invalid/over-budget AI output rejection, timeout handling, hourly throttling and no accidental exposure of server sources.
- Provider tests use mocked upstream responses. No real API key was supplied and no live AI completion was charged.

## Browser workflow checklist

This section is updated as the observed checks complete.

- [x] Dashboard loads and exposes the three sample event types.
- [x] New birthday event created with custom budget, guest count and preferences.
- [x] Generated starter allocation and task count match the selected birthday.
- [x] Initial preview UUID failure on non-HTTPS development origins fixed with a secure-random fallback.
- [x] Dashboard text contrast audited and low-contrast captions darkened.
- [x] Task add/complete and persistence after reload.
- [x] Budget edit and totals update.
- [x] Vendor add and checklist toggle.
- [x] Guest add and RSVP update.
- [x] Idea save and custom idea add.
- [x] AI starter preview and create-new-event flow.
- [x] Backup export downloaded and parsed successfully: completed task, recorded payment, vendor check, confirmed RSVP and saved ideas were all preserved.
- [x] Backup recovery, invalid import, version and duplicate-ID rejection (automated storage tests).
- [x] Visible text contrast check passed on all eight desktop views.
- [x] Live Render deployment: service reached `live`; homepage and `/api/health` returned HTTP 200. `/api/models` returned a live catalog with 467 text-capable models at the check.
- [x] Eight views checked in responsive browser frames at nominal widths 320, 390 and 768 px (24 layout checks): no document-level horizontal overflow. Tables retain their own keyboard-focusable scroll regions.
- [x] Maximum allowed budget (1,000,000,000 currency units) checked at the narrow viewport: full amount remained available without page overflow.
- [x] Modal keyboard wrapping checked across 12 consecutive Tab stops; Escape closes the dialog and focus returns to the invoking control. Internal dialog-padding clicks keep it open.
- [ ] Physical mobile-device, touch and screen-reader testing — responsive frames are layout checks, not a substitute for these checks.

## Limits and honest scope

There is no 100% security, accessibility or defect-free guarantee. This is a single-device/browser application; it has no login, cloud database, real-time collaboration, automated messaging, actual vendor booking or payment processing. Saved demo records are labeled placeholders. Clearing browser data removes plans; backups are the portability mechanism.

Accessibility review is not a full assistive-technology certification. Responsive styles are implemented; browser/device coverage must be reported only where actually exercised. Automated dependencies are audited against the available registry advisory database at the time of the check, not against undisclosed vulnerabilities. Load, penetration and real provider compatibility testing remain deployment-specific work.

## Publishing state

- Source: https://github.com/hackerncet/gatherly (branch `main`).
- Live app: https://gatherly-qx5g.onrender.com.
- GitHub Actions run `40192450378` passed the initial complete 54-test implementation. Further pushes run the same checks plus the new asset-size gate and full dependency audit.
- Render runs the app on its free Node web-service plan in Singapore and automatically deploys changes from `main`. The service uses Render’s default TCP readiness probe; `/api/health` was additionally verified over HTTPS.
- HTTPS responses include the app’s same-origin CSP, HSTS and no-store API policy. Attempts to fetch `/.env` and `/server/app.mjs` returned 404.
- The initial deployment used the requested dummy key and access code. The owner has since reported updating the key; the latest audit still observed `aiEnabled: false`. Secret values were not inspected. See the live AI audit for the activation conditions and remaining blocker.

## Improvements in this review

- Added task editing and an explicit option to shift unfinished deadlines when the event date changes. Completed task dates and payment records are preserved.
- Added lazy loading for secondary views. The initial JavaScript bundle decreased from 397.49 kB / 119.67 kB gzip to 357.27 kB / 110.57 kB gzip in the local production build. CSS was 57.94 kB / 12.35 kB gzip. These are build measurements, not Core Web Vitals.
- Added corruption-recovery downloads, duplicate workspace-ID validation, a larger bounded backup import, explicit selector labels, Escape dismissal for search and better modal input focus.
- Fixed accidental dismissal when clicking a dialog’s internal padding.
- Added concurrent catalog deduplication, three-request concurrency cap and daily AI attempt cap tests.
- Audited all dependencies including development dependencies: zero known vulnerabilities reported by `npm audit --audit-level=moderate` at this check.

- Added an explicit first/last keyboard loop and focus restoration for modal dialogs.
- Fixed hidden table labels escaping their scroll container at narrow widths; added named, focusable table regions and safe wrapping for large currency values.
- Removed an unnecessary stylesheet import. CI enforces reviewed size budgets of 400 kB / 125 kB gzip for the initial JavaScript entry and 75 kB / 16 kB gzip for CSS.
