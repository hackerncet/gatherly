import test from "node:test";
import assert from "node:assert/strict";
import { eventFromPlan } from "../src/lib/domain.ts";
import {
  activeEvent,
  updateWorkspaceEvent,
  appendWorkspaceEvent,
  removeWorkspaceEvent,
} from "../src/lib/workspace.ts";
const event = () =>
  eventFromPlan({
    title: "Workspace review",
    type: "community",
    date: "2027-05-15",
    location: "Bengaluru",
    guests: 40,
    budget: 60000,
    currency: "INR",
    preferences: "",
  });
const workspace = () => {
  const first = event();
  return { version: 1, events: [first], activeId: first.id };
};
test("workspace commands validate IDs and limits without mutating the original records", () => {
  const original = workspace();
  const extra = event();
  const added = appendWorkspaceEvent(original, extra);
  assert.equal(original.events.length, 1);
  assert.equal(activeEvent(added).id, extra.id);
  const updated = updateWorkspaceEvent(added, { ...extra, title: "Changed" });
  assert.equal(activeEvent(updated).title, "Changed");
  assert.equal(extra.title, "Workspace review");
  assert.throws(() => updateWorkspaceEvent(original, extra), /no longer/);
  assert.throws(
    () => appendWorkspaceEvent(original, original.events[0]),
    /Duplicate/,
  );
  const removed = removeWorkspaceEvent(added, extra.id);
  assert.equal(removed.activeId, original.activeId);
  assert.throws(
    () => removeWorkspaceEvent(original, original.activeId),
    /last one/,
  );
  assert.equal(
    removeWorkspaceEvent(added, original.activeId).activeId,
    extra.id,
  );
  assert.throws(
    () =>
      appendWorkspaceEvent(
        { ...original, events: Array.from({ length: 30 }, event) },
        extra,
      ),
    /30 events/,
  );
});
test("active event fallback is explicit and an impossible empty workspace fails safely", () => {
  const value = workspace();
  assert.equal(
    activeEvent({ ...value, activeId: "missing" }).id,
    value.activeId,
  );
  assert.throws(() => activeEvent({ ...value, events: [] }), /no events/);
});
