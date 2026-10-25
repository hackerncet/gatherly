# Gatherly — PromptWars evaluation guide

## Problem statement

“Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.”

Gatherly implements this as a responsive personal planning application with a same-origin AI API. It provides a clearly identified starter mode and live OpenRouter generation protected by server credentials, a private access code and explicit consent. Live configuration is enabled; successful real-provider generation after the latest fix remains unverified.

Findings, implementation loop, measured evidence and remaining limits: [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md). The original analysis is preserved in [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md). Earlier baseline: [LIVE_AI_AUDIT_2026-10-25.md](LIVE_AI_AUDIT_2026-10-25.md).

## The six requested parameters

| Parameter | Reviewable implementation | Verification |
| --- | --- | --- |
| Code Quality | Strict TypeScript across frontend/domain/API, schema-derived contracts, focused provider/client/repository modules, atomic revision checks, lint and formatting | Production-environment CI; strict type check; stale-write and migration tests |
| Efficiency | Lazy secondary views, cached/deduplicated catalog, immutable fingerprinted assets, revalidated HTML, bounded requests and provider concurrency | Initial JS 114,519 bytes gzip; CSS 12,580 bytes gzip; enforced size gates and cache/concurrency tests |
| Accessibility | Native dialogs, keyboard focus/trapping/restoration, skip link, labeled controls, valid landmarks, visible statuses and reduced motion | Structural axe tests across nine views and the full shell; 27 responsive/visible-text contrast checks; physical assistive-technology certification not claimed |
| Security | Server-only provider key, constant-time private-code comparison, server-validated consent, minimal brief disclosure, streaming byte caps, exact-budget validation, CSP, validated imports and CSV injection protection | Negative HTTP/privacy/consent/origin/rate-limit tests; zero known dependency vulnerabilities at the recorded audit |
| Testing | 105 Node tests and 21 UI/axe tests; separate enforced core and scoped UI coverage gates | 126 tests run in production-environment CI and the Render build; latest verified outcomes are recorded in the audit |
| Problem Statement Alignment | Three event types, planned/paid budgets, editable timelines, vendor checklists, RSVPs, personalized ideas, model selection, preview, provenance and an event-day guide | Three-event starter/schema checks, preference regressions, UI workflows, agenda persistence, calendar/brief payload tests |

## Five-minute demonstration

1. Open the app. Switch between wedding, birthday and community samples.
2. Create an event with a date, city, guest count, budget, currency and preferences.
3. Open Budget, edit a category and record a payment. Check the remaining amount and CSV export.
4. Open Timeline, add or edit a task and complete it. Change the event date and review deadline rescheduling.
5. Add a vendor, record a quote and work through the four booking checks. The app does not book vendors.
6. Add a household to Guest list and set party size and RSVP. Record personal notes only with permission.
7. Save an inspiration idea or add your own.
8. Open AI Studio, search the text-model catalog, filter free models and preview a starter plan. For live generation, use the private access code from the owner's Render AI_ACCESS_CODE setting and consent to sharing the event brief. Review the response before creating a separate event. Provider output may be rejected or time out; these errors preserve the existing event.
9. Open Event guide, add a timed moment and responsible team, inspect planning risks, and use calendar/brief export.
10. Export a workspace backup, reload and check persistence. A competing tab's revision cannot silently overwrite your edits; the conflict flow preserves recovery/export options.

## AI behavior and data boundary

- A single selected text-capable OpenRouter model handles each request. The app does not call every model in parallel or promise every provider endpoint will work.
- The live catalog determines current availability. Native JSON Schema and compatible-provider routing are requested when advertised, then JSON mode where available; other models retain validated prompt-based structured output.
- Only the event brief and planning request reach the provider. Guest lists, vendor contacts, actual payments and private access codes are excluded from the model prompt.
- Output must pass bounded schema validation. AI suggests relative category priorities; application code reserves 10% for contingency and calculates exact currency amounts with deterministic rounding. Invalid, empty or truncated output is rejected with a safe explanation.
- There are no automatic paid retries or hidden model substitutions. Token/time, hourly, daily and concurrency limits remain in place.
- Budget figures are estimates. Prices, availability and local requirements need organizer verification.

## Scoring boundary

No private PromptWars rubric, deduction annotations or fresh external result were supplied. This document maps the requested parameters to observable implementation and evidence; it does not invent a 98/100 or 100/100 result.

The audit records the failed initial real-provider run and the missing post-fix acceptance result. Calendar/Markdown payload and link tests pass, but the cloud browser did not confirm download completion for those file types. These are not counted as successful end-to-end acceptance tests.

The app stores plans locally in the browser. It does not claim cloud collaboration, account authentication, actual vendor booking, automated messaging, payment processing, full WCAG certification, independent penetration testing or large-scale load-test certification.
