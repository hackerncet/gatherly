import test from "node:test";
import assert from "node:assert/strict";
import {
  aiPlanSchema,
  eventFromPlan,
  starterPlan,
  workspaceSchema,
} from "../src/lib/domain.ts";
import {
  planningInsights,
  calendarFile,
  eventBrief,
} from "../src/lib/planning.ts";
const brief = {
  title: "Neighborhood gathering",
  type: "community",
  date: "2028-03-01",
  location: "Bengaluru",
  guests: 50,
  budget: 50000,
  currency: "INR",
  preferences: "",
};
test("maximum valid preference length still produces a valid structured starter", () => {
  const plan = starterPlan({ ...brief, preferences: "x".repeat(1600) });
  assert.ok(aiPlanSchema.safeParse(plan).success);
  assert.ok(plan.summary.length <= 1500);
});
for (const [preference, tag] of [
  ["wheelchair and quiet area", "Accessibility"],
  ["vegan and gluten allergies", "Food & inclusion"],
  ["outdoor garden rain plan", "Weather plan"],
  ["eco friendly low waste", "Sustainability"],
])
  test(`starter customizes ideas for ${tag}`, () => {
    const plan = starterPlan({ ...brief, preferences: preference });
    assert.ok(plan.ideas.some((i) => i.tag === tag));
    assert.notDeepEqual(plan.ideas, starterPlan(brief).ideas);
  });
test("vendor guidance creates generic unchecked shortlist entries without invented quotes", () => {
  const event = eventFromPlan(brief);
  assert.ok(event.vendors.length >= 2);
  assert.ok(
    event.vendors.every(
      (v) =>
        v.quote === 0 &&
        !v.contact &&
        v.checklist.every((x) => !x) &&
        v.status === "shortlisted",
    ),
  );
});
test("older backups gain an empty event-day schedule and preserve their records", () => {
  const event = eventFromPlan(brief);
  delete event.agenda;
  delete event.provenance;
  const result = workspaceSchema.parse({
    version: 1,
    events: [event],
    activeId: event.id,
  });
  assert.deepEqual(result.events[0].agenda, []);
});
test("readiness insights identify budget, deadline, booking and RSVP gaps", () => {
  const event = eventFromPlan(brief);
  event.budgets[0].planned = 60000;
  event.budgets[0].paid = 60000;
  event.vendors[0].status = "booked";
  const risks = planningInsights(event, "2030-01-01");
  assert.ok(risks.some((r) => r.page === "budget"));
  assert.ok(risks.some((r) => r.page === "timeline"));
  assert.ok(risks.some((r) => r.page === "vendors"));
  assert.ok(risks.some((r) => r.page === "guests"));
});
test("calendar export escapes injection and Unicode lines remain within 75 octets", () => {
  const event = eventFromPlan({ ...brief, title: "A, B; C\nBEGIN:VEVENT" });
  event.tasks = [
    {
      id: "one",
      title: "స్వాగతం ".repeat(18),
      date: "2028-02-29",
      category: "Welcome",
      done: false,
    },
    {
      id: "done",
      title: "Completed",
      date: "2028-02-01",
      category: "Planning",
      done: true,
    },
  ];
  const result = calendarFile(event, new Date("2026-10-25T10:00:00Z"));
  assert.equal(
    result.split("\r\n").filter((line) => line === "BEGIN:VEVENT").length,
    2,
  );
  assert.match(result, /DTEND;VALUE=DATE:20280301/);
  assert.match(result, /SUMMARY:A\\, B\\; C\\nBEGIN:VEVENT/);
  assert.doesNotMatch(result, /SUMMARY:Completed/);
  for (const line of result.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
test("shareable brief includes schedule and outstanding preparation without guest notes", () => {
  const event = eventFromPlan(brief);
  event.agenda = [
    { id: "agenda", time: "10:00", title: "Doors open", owner: "Welcome team" },
  ];
  event.guestList = [
    {
      id: "g",
      name: "Private guest",
      group: "Family",
      count: 1,
      rsvp: "pending",
      dietary: "Private medical note",
    },
  ];
  const text = eventBrief(event);
  assert.match(text, /10:00 — Doors open \(Welcome team\)/);
  assert.doesNotMatch(text, /Private medical|Private guest/);
});

test("calendar escapes standalone carriage returns and scopes duplicate raw IDs by record type", () => {
  const event = eventFromPlan({
    ...brief,
    title: "Meeting\rBEGIN:VEVENT\r\nInjected\nline",
  });
  event.tasks = [
    {
      id: event.id,
      title: "Separate task",
      date: event.date,
      category: "Planning",
      done: false,
    },
  ];
  const result = calendarFile(event);
  assert.equal(
    result.split("\r\n").filter((line) => line === "BEGIN:VEVENT").length,
    2,
  );
  assert.match(result, /Meeting\\nBEGIN:VEVENT\\nInjected\\nline/);
  const ids = result.split("\r\n").filter((line) => line.startsWith("UID:"));
  assert.equal(new Set(ids).size, 2);
});

test("brief export escapes HTML and link instructions and orders the agenda chronologically", () => {
  const event = eventFromPlan({
    ...brief,
    title: "<script>alert(1)</script>",
    preferences: "[Click](javascript:alert(1))\n# forged heading",
  });
  event.agenda = [
    { id: "late", time: "16:00", title: "Later", owner: "" },
    { id: "early", time: "10:00", title: "Earlier", owner: "" },
  ];
  const text = eventBrief(event);
  assert.doesNotMatch(text, /<script>|\[Click\]\(|\n# forged/);
  assert.match(text, /&lt;script&gt;/);
  assert.ok(text.indexOf("10:00") < text.indexOf("16:00"));
});

test("the final representable calendar date exports as a valid single all-day event", () => {
  const event = eventFromPlan({ ...brief, date: "9999-12-31" });
  event.tasks = [];
  const calendar = calendarFile(event);
  assert.match(calendar, /DTSTART;VALUE=DATE:99991231/);
  assert.doesNotMatch(calendar, /DTEND|10000/);
});
