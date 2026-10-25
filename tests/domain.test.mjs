import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateBudget,
  briefSchema,
  eventFromPlan,
  eventSchema,
  escapeCsv,
  shiftDate,
  starterPlan,
  totals,
  today,
  workspaceSchema,
} from "../src/lib/domain.ts";
const brief = {
  title: "A beautiful day",
  type: "wedding",
  date: "2027-03-20",
  location: "Bengaluru",
  guests: 120,
  budget: 600000,
  currency: "INR",
  preferences: "Vegetarian food and step-free access",
};
for (const type of ["wedding", "birthday", "community"])
  test(`${type}: complete valid starter event and exact budget`, () => {
    const event = eventFromPlan({ ...brief, type });
    assert.equal(eventSchema.safeParse(event).success, true);
    assert.equal(totals(event).allocated, brief.budget);
    assert.ok(event.tasks.length >= 8);
    assert.ok(event.ideas.length >= 3);
    assert.ok(event.budgets.some((b) => b.category === "Contingency"));
    assert.ok(event.tasks.every((t) => t.date <= brief.date));
    assert.equal(
      new Set(event.tasks.map((t) => t.id)).size,
      event.tasks.length,
    );
  });
test("allocation preserves whole currency units for small and uneven budgets", () => {
  for (const total of [1, 2, 7, 99, 101, 9999, 999999999]) {
    const result = allocateBudget(total, [
      ["one", 40],
      ["two", 35],
      ["reserve", 25],
    ]);
    assert.equal(
      result.reduce((n, b) => n + b.amount, 0),
      total,
    );
    assert.ok(result.every((b) => Number.isInteger(b.amount) && b.amount >= 0));
  }
});
test("budget actuals and completion are derived from records", () => {
  const event = eventFromPlan(brief);
  event.budgets[0].paid = 700000;
  event.tasks[0].done = true;
  event.guestList = [
    { rsvp: "confirmed", count: 4 },
    { rsvp: "pending", count: 3 },
    { rsvp: "declined", count: 2 },
  ];
  assert.equal(totals(event).remaining, -100000);
  assert.equal(totals(event).completed, 1);
  assert.equal(totals(event).confirmed, 4);
});
for (const [name, change] of [
  ["empty title", { title: "" }],
  ["invalid leap date", { date: "2027-02-29" }],
  ["rollover date", { date: "2027-02-31" }],
  ["negative budget", { budget: -1 }],
  ["fractional currency", { budget: 1.5 }],
  ["infinite budget", { budget: Infinity }],
  ["unsupported currency", { currency: "XYZ" }],
  ["zero guests", { guests: 0 }],
  ["oversized preferences", { preferences: "x".repeat(1601) }],
])
  test(`brief rejects ${name}`, () =>
    assert.equal(
      briefSchema.safeParse({ ...brief, ...change }).success,
      false,
    ));
test("leap year and year boundary date arithmetic", () => {
  assert.equal(shiftDate("2028-03-01", -1), "2028-02-29");
  assert.equal(shiftDate("2027-01-01", -1), "2026-12-31");
});
test("workspace versions and nested data are validated", () => {
  const event = eventFromPlan(brief);
  const workspace = { version: 1, events: [event], activeId: event.id };
  assert.equal(workspaceSchema.safeParse(workspace).success, true);
  assert.equal(
    workspaceSchema.safeParse({ ...workspace, version: 2 }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({ ...workspace, events: [] }).success,
    false,
  );
  event.tasks[0].date = "bad";
  assert.equal(workspaceSchema.safeParse(workspace).success, false);
});
test("CSV escapes quotes, newlines and spreadsheet formulas", () => {
  assert.equal(escapeCsv('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(escapeCsv("line\nnext"), '"line\nnext"');
  assert.equal(escapeCsv("ordinary"), '"ordinary"');
});
test("starter suggestions remain explicitly estimates and preserve preferences", () => {
  const plan = starterPlan(brief);
  assert.match(plan.summary, /not vendor quotes/);
  assert.match(plan.summary, /step-free/);
});

test("short-notice events schedule starter tasks today instead of immediately overdue", () => {
  const event = eventFromPlan({ ...brief, date: shiftDate(today(), 3) });
  assert.ok(
    event.tasks.every(
      (task) => task.date >= today() && task.date <= event.date,
    ),
  );
});
test("past event timelines preserve historical dates", () => {
  const date = shiftDate(today(), -30);
  const event = eventFromPlan({ ...brief, date });
  assert.ok(event.tasks.every((task) => task.date < date));
});

test("event rescheduling moves unfinished tasks and preserves completed dates and payments", async () => {
  const { reviseEvent } = await import("../src/lib/domain.ts");
  const event = eventFromPlan(brief);
  event.tasks[0].done = true;
  event.budgets[0].paid = 1200;
  const updated = reviseEvent(event, {
    ...brief,
    date: shiftDate(brief.date, 14),
  });
  assert.equal(updated.tasks[0].date, event.tasks[0].date);
  assert.equal(updated.tasks[1].date, shiftDate(event.tasks[1].date, 14));
  assert.equal(updated.budgets[0].paid, 1200);
  assert.equal(event.date, brief.date);
});
test("event rescheduling can preserve every original deadline", async () => {
  const { reviseEvent } = await import("../src/lib/domain.ts");
  const event = eventFromPlan(brief);
  const updated = reviseEvent(
    event,
    { ...brief, date: shiftDate(brief.date, 21) },
    false,
  );
  assert.deepEqual(updated.tasks, event.tasks);
});
test("CSV neutralizes whitespace-prefixed formulas and newline prefixes", () => {
  for (const value of [" =1+1", "\t=SUM(A1)", "\n+cmd", "\uFEFF@SUM(A1)"])
    assert.ok(escapeCsv(value).startsWith("\"'"));
});

test("secure UUID fallback works without randomUUID and preserves uniqueness", async () => {
  const { uid } = await import("../src/lib/domain.ts");
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const source = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: source.getRandomValues.bind(source) },
  });
  try {
    const values = Array.from({ length: 20 }, uid);
    assert.equal(new Set(values).size, 20);
    assert.ok(
      values.every((value) =>
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          value,
        ),
      ),
    );
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
});
