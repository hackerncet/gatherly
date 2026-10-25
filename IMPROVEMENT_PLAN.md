# Gatherly improvement cycle — 25 October 2026

External scores supplied by the owner: overall 93.51; code quality 86, security 98, efficiency 100, testing 98, accessibility 96, alignment 93. The private evaluator rubric and deduction explanations were not supplied, so the following are independently verified gaps, not asserted explanations of its marks.

## Findings before implementation

1. Shared domain and server JavaScript are excluded from strict type checking; frontend contracts duplicate runtime schemas.
2. Whole-workspace localStorage writes lose changes from stale tabs. No transaction or revision conflict flow exists.
3. A valid brief with 1,600 preference characters yields an 1,830-character starter summary, exceeding the 1,500-character response contract (reproduced).
4. Starter ideas do not change with accessibility/dietary/weather preferences (reproduced).
5. Live health reports aiEnabled=false. Both API key and a private access code are required; secrets have not been read or changed.
6. AI response validation lacks vendor selection/checklist guidance, plan provenance, exact allocation and explicit contingency checks.
7. No automated component/accessibility coverage, coverage gate or static linting. Existing 54 tests do pass.
8. A global reload fallback exists, but it cannot export the current in-memory workspace after a page failure. API health failures are silently ignored.
9. No calendar export, day-of schedule or consolidated readiness/risk view.
10. Upstream JSON response sizes are checked only after reading; provider errors/catalog behavior need bounded typed contracts.

## Implementation order and acceptance

- **Contracts and quality:** migrate domain/server to strict TypeScript, derive shared types from schemas, add linting and split API concerns. All production code must type-check without any/ts-ignore suppressions.
- **Durable local data:** migrate existing localStorage to a versioned IndexedDB repository. Atomic transactions check revisions. Two independent stale writers must produce a conflict, never silent replacement. Keep local edits exportable and provide reload recovery. Existing backups remain importable.
- **Planning relevance:** validate every starter/AI plan, bound summaries, tailor starter ideas/tasks, include vendor requirements and clear provenance. Add an editable day-of schedule, deterministic risk insights and calendar/brief export.
- **Resilience and accessibility:** add page error recovery, explicit readiness/network state, keyboard/focus and accessible status behavior. Keep the existing visual theme and responsive layouts.
- **Evidence:** retain all meaningful regression cases, add transaction/concurrency, schema edge, component/keyboard/axe tests and coverage thresholds. Audit dependencies, enforce asset budgets, review live UI and check runtime logs after deployment.

## Evaluation loop

Run baseline → reproduce → fix → regression/component/accessibility checks → AI code review → fix new findings → deploy → live verification. Report measured evidence and remaining limits. Do not manufacture an external 98/100 or 100/100 score; only the external evaluator can issue that result. Real-provider acceptance remains pending until the configured deployment can authenticate a request.
