# Security model

Gatherly is a browser-local planning application with a server-side AI proxy. It is not a multi-user SaaS or a system for storing confidential institutional records.

## Trust boundaries and controls

Workspace transactions compare revisions atomically across tabs. Stale writers are blocked, their local edits remain exportable, and clean tabs synchronize through BroadcastChannel or a focus refresh. An open editing form is treated as an unsaved draft. Imports and recovery replacements also use revision checks.

- **Browser data:** Events, guest lists and vendor contacts stay in IndexedDB in the current browser profile; an older localStorage workspace is migrated transactionally and removed only after a successful commit. They are not encrypted or account protected. A person with access to the browser profile can access the plans. Backups contain the same data.
- **Server secrets:** OpenRouter credentials are read only from environment variables. Source, build assets and API responses do not include the real API key. `.env` files are ignored; `.env.example` contains dummy values only.
- **AI access:** Live generation requires both a configured API key and an owner-chosen access code of at least 16 characters. The code is compared with constant-time comparison after a length check. It is held only in UI component memory and not written to localStorage, exports or model prompts. Distribute it privately and rotate it if disclosed.
- **Consent and minimization:** The UI and server both require explicit consent before live generation. Only explicit event brief fields and the additional request reach the model provider. The server parses the allowed schema and drops unrelated client fields. Avoid entering confidential information into the event brief itself.
- **Untrusted output:** Model output is rendered as React text, never HTML, JavaScript or executable Markdown. JSON must match a bounded schema. Providers supply category weights; application code calculates exact whole currency amounts after reserving 10% for contingency. Negative/fractional/oversized weights, ambiguous categories and unusable output are rejected. Currency amounts supplied by a provider are not trusted. Model IDs are bounded JSON values checked against the live catalog, and never become URLs. Streamed provider bodies are bounded before JSON parsing (100 KB completion envelope, 3 MB catalog). Models do not receive tools and cannot book, purchase, send invitations or modify existing events.
- **Abuse controls:** 20 KB JSON body limit; bounded strings, lists and whole-number amounts; 8 planning attempts per IP per hour; 30 catalog requests per IP per minute; 3 simultaneous provider generations and 100 provider attempts per UTC day per server process. Provider requests time out after 45 seconds and are cancelled when the client disconnects.
- **Cost limits:** The request token cap is 2,200. App limits are not a monetary guarantee: configure a provider-side spending limit and a restricted OpenRouter key. Per-process counters reset on restart and are not coordinated across replicas. Use a shared rate-limit store and authenticated users before opening commercial public AI access at scale.
- **HTTP:** Helmet sets security headers, a restrictive same-origin CSP and frame denial. Production has no third-party fonts, scripts or image hosts. Cross-origin browser POST requests are rejected. API responses use no-store. The server only serves files from `dist`, not the repository or server source.
- **Exports/imports:** Backups are versioned and structurally validated before replacement. Maximum import size is 25 MB. CSV cell values are quoted and formula prefixes, including whitespace-prefixed formulas, neutralized. Imports require an explicit replace action. Destructive UI actions use confirmation dialogs.
- **Deployment:** HTTPS is supplied by the hosting platform. Production trusts one reverse-proxy hop for client IPs, matching the intended single Render edge deployment; review this assumption for other hosting topologies. Do not expose this server behind an untrusted forwarding chain.
- **Logs:** The app logs readiness only and does not log requests, prompts, secrets or model outputs. Hosting providers may retain their own access logs.

## Operational checks

Run `npm run check` and `npm audit --audit-level=moderate` before releases. Keep dependencies and the Node runtime patched. Never add real secrets to Git; if one is accidentally committed, revoke it immediately and remove it from history as appropriate.

For a future shared/cloud edition, add an authenticated identity system, tenant-scoped authorization, a database with migrations and backups, distributed limits, retention/deletion controls and independent security testing. Do not represent the current browser-local application as having those capabilities.

No software can be guaranteed 100% secure. The checks in QUALITY.md describe verified behavior and remaining limits.
