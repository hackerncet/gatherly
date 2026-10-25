# Gatherly — PromptWars evaluation guide

## Problem statement

“Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.”

The repository implements this as a responsive personal planning application with a same-origin AI API. The owner intentionally requested dummy API credentials; live AI activates after a real server-side OpenRouter key and a private access code are configured. Starter mode is clearly identified and works immediately.

Latest findings, implementation loop and measured evidence: [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md). Earlier baseline: [LIVE_AI_AUDIT_2026-10-25.md](LIVE_AI_AUDIT_2026-10-25.md).

## The six requested parameters

| Parameter                   | Reviewable implementation                                                                                                                                                                                                                                                                          | Verification                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Code Quality                | Focused React/TypeScript views, strict compiler options, pure domain functions, shared Zod schemas, bounded/versioned persistence, consistent formatting, documented architecture and CI                                                                                                           | `npm run build`, `npm run format:check`, source review                                                                                          |
| Efficiency                  | Secondary-view code splitting, one shared origin, immutable fingerprinted assets, revalidated HTML, no external UI assets, cached/deduplicated model catalog, bounded requests and provider concurrency                                                                                            | Production build size gate; cache-header, catalog-deduplication and concurrency tests                                                           |
| Accessibility               | Labeled form controls and tables, keyboard focus indicators, native modal dialogs and Escape, first-field focus, skip link, textual statuses, reduced motion and responsive layouts                                                                                                                | Browser keyboard/form/contrast checks; 24 responsive-frame checks; further assistive-technology verification is listed separately in QUALITY.md |
| Security                    | Server-only OpenRouter key, constant-time private access-code comparison, owner-configured key/code required, request limits, 45-second provider timeout, consent and minimal brief fields, React text rendering, schema-checked output, strict CSP, versioned import and CSV injection protection | Negative HTTP tests; over-budget/malformed response tests; body limits; auth, origin, rate and daily/concurrency-cap checks; dependency audit   |
| Testing                     | 102 domain, storage, concurrency, HTTP, component and axe tests, production build, formatting, dependency audit, browser workflow and deployment smoke checks                                                                                                                                                        | `npm run check`, `npm run format:check`, `npm audit --audit-level=moderate`, QUALITY.md                                                         |
| Problem Statement Alignment | Three event types, category budgets and actual payments, editable task timelines, vendor quote/booking checklists, guest RSVPs, idea boards, OpenRouter model search, personalized generation preview and safe creation of a new event                                                             | Follow the demonstration below; all three starter event schemas and exact allocations are tested                                                |

## Five-minute demonstration

1. Open the app. Switch between the wedding, birthday and community samples to see the different starter plans.
2. Create a new event with your own date, city, guest count, budget, currency and preferences.
3. Open Budget, edit a category and record a payment. Check the remaining amount and export CSV.
4. Open Timeline, add/edit a task and complete it. Update the event date and review the option to move unfinished deadlines.
5. Add a real vendor, record a quote and work through the four booking checks. No real booking is made by the application.
6. Add a household to Guest list, set its party size and RSVP, and add dietary/access notes only with permission.
7. Save an inspiration idea or add your own.
8. Open AI Studio. Search the live text-model catalog, filter free models and review a starter plan. After configuring real credentials, consent to share the event brief and generate a live plan. Review it before creating a separate new event.
9. Open Event guide, add a timed moment and responsible team, export the calendar and event brief, and review planning risks.
10. Export a complete workspace backup in Settings, reload the page and verify persistence. Imports require an explicit replacement action.

## AI behavior and data boundary

- A single selected text-capable OpenRouter model handles each generation. The app does not call every model in parallel or promise compatibility with image/audio-only endpoints.
- The live catalog determines current model availability and reports a limited fallback if unavailable.
- Only the event brief and planning request are submitted. Guest lists, vendor contacts, actual payments and the private access code are not part of the model prompt.
- The output must be structured, bounded JSON. A plan that exceeds the budget or fails validation is rejected, preserving the current event.
- Budget figures are estimates, and any vendor availability or local requirements need human confirmation.

## Scoring boundary

No official PromptWars scoring rubric or scorer was supplied. This document maps each requested parameter to concrete implementation and evidence; it does not invent a 100% result. “All automated checks pass” applies to the checks actually run. It is not a guarantee of zero defects, full WCAG certification, penetration-test certification or an organizer-assigned competition score.

The current product is browser-local. It does not claim cloud sync, authenticated collaboration, actual vendor booking, automated messaging or payment processing. Those are outside the supplied problem statement and should not be presented as implemented features.

## Published submission

- Application: https://gatherly-qx5g.onrender.com
- Source and CI: https://github.com/hackerncet/gatherly
- Evidence and verification limits: [QUALITY.md](QUALITY.md)
- Secret setup and operating limits: [SECURITY.md](SECURITY.md)

The deployed app deliberately starts in starter mode until the owner configures the real API key and private access code. This is the dummy-key behavior requested in the brief.
