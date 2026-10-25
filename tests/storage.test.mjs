import test from "node:test";
import assert from "node:assert/strict";
import { loadWorkspace, parseBackup, STORAGE_KEY } from "../src/lib/storage.ts";
import { eventFromPlan } from "../src/lib/domain.ts";
const records = new Map();
globalThis.localStorage = {
  getItem: (key) => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
};
const event = eventFromPlan({
  title: "Storage test",
  type: "birthday",
  date: "2027-02-01",
  location: "Bengaluru",
  guests: 20,
  budget: 20000,
  currency: "INR",
  preferences: "",
});
const workspace = { version: 1, events: [event], activeId: event.id };
test("legacy workspace migrates without losing payments or tasks", () => {
  event.budgets[0].paid = 1234;
  event.tasks[0].done = true;
  records.set(STORAGE_KEY, JSON.stringify(workspace));
  const restored = loadWorkspace();
  assert.equal(restored.warning, "");
  assert.equal(restored.workspace.events[0].budgets[0].paid, 1234);
  assert.equal(restored.workspace.events[0].tasks[0].done, true);
});
test("malformed stored data is preserved while recovery workspace is offered", () => {
  records.set(STORAGE_KEY, "broken json");
  const restored = loadWorkspace();
  assert.match(restored.warning, /not been overwritten/);
  assert.equal(records.get(STORAGE_KEY), "broken json");
  assert.equal(restored.workspace.events.length, 3);
});
test("backup parsing rejects invalid, oversized and unknown versions", () => {
  assert.throws(() => parseBackup("bad"));
  assert.throws(() => parseBackup("x".repeat(25000001)));
  assert.throws(() =>
    parseBackup(JSON.stringify({ ...workspace, version: 100 })),
  );
});
test("backup parsing rejects duplicate event and nested item IDs", () => {
  assert.throws(() =>
    parseBackup(JSON.stringify({ ...workspace, events: [event, event] })),
  );
  const copied = structuredClone(workspace);
  copied.events[0].tasks.push(copied.events[0].tasks[0]);
  assert.throws(() => parseBackup(JSON.stringify(copied)));
});
test("backup parsing safely repairs an obsolete active event reference", () => {
  const restored = parseBackup(
    JSON.stringify({ ...workspace, activeId: "missing-event" }),
  );
  assert.equal(restored.activeId, event.id);
});
test("unavailable browser storage produces a recoverable warning", () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error("unavailable");
    },
  };
  try {
    const result = loadWorkspace();
    assert.ok(result.warning);
    assert.equal(result.workspace.events.length, 3);
  } finally {
    globalThis.localStorage = previous;
  }
});

test("unread saved data is available for recovery without overwriting", () => {
  records.set(STORAGE_KEY, '{"version":999}');
  const result = loadWorkspace();
  assert.equal(result.recovery, '{"version":999}');
  assert.equal(records.get(STORAGE_KEY), '{"version":999}');
});
test("duplicate event IDs in browser storage trigger recovery instead of ambiguous editing", () => {
  records.set(
    STORAGE_KEY,
    JSON.stringify({ ...workspace, events: [event, event] }),
  );
  assert.ok(loadWorkspace().warning);
});
