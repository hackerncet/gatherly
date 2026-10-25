# Gatherly

Live app: https://gatherly-qx5g.onrender.com · Source: https://github.com/hackerncet/gatherly

A thoughtful GenAI event planning assistant for weddings, birthdays and community events. Plan a budget, build a timeline, organize real vendor quotes, track guests and discover personal touches in one calm workspace.

## Run locally

Requires Node.js 24 and npm. Node 24 is the tested runtime for native TypeScript execution.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. For the production version:

```sh
npm run build
npm start
```

The server binds to `0.0.0.0` and respects `PORT`. The interface and API share one origin. No hosted database or external font/image service is required. Browser-local IndexedDB stores plans. Non-overview screens are loaded on demand.

## What works

- Wedding, birthday and community event creation, editing and switching.
- Complete starter timelines and currency-exact budget allocations, including contingency.
- Budget categories, planned amounts, actual payments, over-budget alerts and CSV exports.
- Editable, dated task checklists with to-do, overdue and completed views; optional rescheduling of unfinished tasks when the event date changes.
- Vendor quotes, contact details, booking statuses and four-point verification checklists.
- Guest/household counts, RSVP statuses and dietary/access notes; CSV export.
- Event-specific inspiration boards with saved and custom ideas, tailored to access, food, weather and low-waste preferences.
- Editable event-day schedule, recorded-data planning insights, iCalendar task/event export and a shareable event brief.
- Initial plan provenance: starter/AI source, model when available and creation date.
- AI Studio with searchable live OpenRouter text-model catalog, free-only filtering, bounded generation, cancel, preview and creation of a separate new event.
- Atomic, revision-checked IndexedDB saves with cross-tab conflict recovery, validated JSON import (up to 25 MB), complete workspace backup and unread-data recovery downloads.
- Keyboard navigation, labeled forms, native focus-trapped dialogs, reduced-motion support and responsive layouts.

## AI configuration

The app works in **starter mode** without an API key. Starter suggestions are curated templates, clearly labeled as such; they are not claimed to be live AI output.

Set these server-side environment variables in Render:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-DUMMY_REPLACE_ME
AI_ACCESS_CODE=DUMMY_REPLACE_WITH_A_STRONG_ACCESS_CODE
NODE_ENV=production
```

Replace both dummy values with a real OpenRouter key and a strong, private access code of at least 16 characters, then choose **Save and deploy** in Render. Enter only the access code in AI Studio. The API key must never be placed in frontend code or a `VITE_` variable. The real values are excluded from Git.

For local AI, create an ignored `.env` using `.env.example`, replace its dummy values and run:

```sh
node --env-file=.env server/index.ts
```

Build first when using that production command. The event brief and additional request are sent to OpenRouter after consent. Guest lists, vendor contacts, payment records and access codes are not included in the model prompt.

The app supports all **text-capable chat models** exposed by the current OpenRouter `/models` catalog. Image/audio-only models do not produce this app's text plans. Each request uses one selected model; it does not call every provider. Availability, supported features and prices can change. The catalog is cached for one hour; a labeled limited fallback is offered on network failure. Models suggest bounded relative category weights. Application code reserves 10% for contingency (rounded up to a whole currency unit) and allocates the remainder exactly with deterministic rounding; model-generated currency amounts are never trusted. Native JSON Schema is requested when advertised, JSON mode when available, and validated prompt-based JSON otherwise. Malformed or unusable plans are rejected. Variable prices are labeled unavailable, and catalog-listed model aliases are accepted. A failed generation leaves the saved event intact.

## Deploy on Render

Create a **Web Service** linked to this repository:

| Setting       | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Runtime       | Node                                                               |
| Branch        | `main`                                                             |
| Build command | `npm ci --include=dev && npm run check`                            |
| Start command | `npm start`                                                        |
| Health check  | `/api/health`                                                      |
| Plan          | Free for evaluation, or a chosen paid instance                     |
| Environment   | `NODE_ENV=production`, the two dummy values above until configured |

No disk or database is needed: plans stay in each visitor's browser. The app includes no account system, cloud synchronization, shared workspace or automatic invitations/bookings. Export a backup before clearing browser data or switching devices. Render's free service can sleep when idle; review the current platform limits before using it for time-sensitive events.

## Verification

```sh
npm run check
npm run format:check
npm audit --audit-level=moderate
```

`npm run check` performs ESLint (including hooks/accessibility checks), strict TypeScript checking across frontend/shared/server code, a Vite production build, asset-size budgets, Node integration tests and Vitest component/axe tests with coverage gates. See [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md) for the latest findings and fix loop, [QUALITY.md](QUALITY.md) for evidence and limits and [EVALUATION.md](EVALUATION.md) for the six-criterion evaluation guide. Automated tests use mocked provider responses. Separate real-provider acceptance results and their limits are recorded in the audit.

## Structure

```text
src/components/  Accessible shared UI and event form
src/pages/       Nine focused planning views, including the event-day guide
src/lib/         Domain schemas, templates, totals, date logic, persistence
server/          Same-origin Express API and production/static serving
tests/           Domain, API, concurrency, persistence, component and axe tests
```

See [SECURITY.md](SECURITY.md) for trust boundaries, deployment assumptions and operational guidance.
