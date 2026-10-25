# Quality and acceptance evidence

Checked on 25 October 2026. This report records tested behavior, not a claim of perfection or certification.

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
- [ ] Live Render deployment smoke test — to be verified after deployment.
- [ ] Native mobile-device and screen-reader testing — responsive CSS and semantic controls are implemented; these device checks were not performed.

## Limits and honest scope

There is no 100% security, accessibility or defect-free guarantee. This is a single-device/browser application; it has no login, cloud database, real-time collaboration, automated messaging, actual vendor booking or payment processing. Saved demo records are labeled placeholders. Clearing browser data removes plans; backups are the portability mechanism.

Accessibility review is not a full assistive-technology certification. Responsive styles are implemented; browser/device coverage must be reported only where actually exercised. Automated dependencies are audited against the available registry advisory database at the time of the check, not against undisclosed vulnerabilities. Load, penetration and real provider compatibility testing remain deployment-specific work.

## Publishing state

The owner has confirmed the `hackerncet/gatherly` GitHub repository and the expressfreefire Render account. Source publication and live deployment verification are in progress.

## Improvements in this review

- Added task editing and an explicit option to shift unfinished deadlines when the event date changes. Completed task dates and payment records are preserved.
- Added lazy loading for secondary views. The initial JavaScript bundle decreased from 397.49 kB / 119.67 kB gzip to 356.65 kB / 110.37 kB gzip in the local production build. CSS was 57.55 kB / 12.24 kB gzip. These are build measurements, not Core Web Vitals.
- Added corruption-recovery downloads, duplicate workspace-ID validation, a larger bounded backup import, explicit selector labels, Escape dismissal for search and better modal input focus.
- Fixed accidental dismissal when clicking a dialog’s internal padding.
- Added concurrent catalog deduplication, three-request concurrency cap and daily AI attempt cap tests.
- Audited all dependencies including development dependencies: zero known vulnerabilities reported by `npm audit --audit-level=moderate` at this check.
