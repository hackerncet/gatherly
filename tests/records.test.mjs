import test from "node:test";
import assert from "node:assert/strict";
import { eventFromPlan } from "../src/lib/events.ts";
import { changeWorkspaceEvent } from "../src/lib/workspace.ts";
import {
  changeEventRecord,
  removeEventRecord,
  saveEventRecord,
} from "../src/lib/records.ts";
import { RECORD_LIMITS } from "../src/lib/limits.ts";
import { eventSchema } from "../src/lib/schemas.ts";

const event = () =>
  eventFromPlan({
    title: "Command review",
    type: "community",
    date: "2027-05-15",
    location: "Bengaluru",
    guests: 40,
    budget: 60000,
    currency: "INR",
    preferences: "",
  });
const entries = {
  budgets: { id: "new", category: "Transport", planned: 100, paid: 0 },
  tasks: {
    id: "new",
    title: "Check venue",
    date: "2027-05-10",
    category: "Planning",
    done: false,
  },
  vendors: {
    id: "new",
    name: "Local team",
    category: "Venue",
    contact: "",
    quote: 0,
    status: "shortlisted",
    notes: "",
    checklist: [false, false, false, false],
  },
  guestList: {
    id: "new",
    name: "Sample household",
    group: "Friends",
    count: 2,
    rsvp: "pending",
    dietary: "",
  },
  ideas: {
    id: "new",
    title: "Memory wall",
    detail: "Invite everyone to contribute",
    tag: "Personal",
    saved: true,
  },
  agenda: { id: "new", time: "15:30", title: "Welcome", owner: "Organizer" },
};

test("independent commands evaluated from one render preserve both changes and other event records", () => {
  const first = event(),
    other = event();
  let workspace = { version: 1, events: [first, other], activeId: first.id };
  const addBudget = (current) =>
    saveEventRecord(current, "budgets", entries.budgets, "create");
  const addGuest = (current) =>
    saveEventRecord(current, "guestList", entries.guestList, "create");
  workspace = changeWorkspaceEvent(workspace, first.id, addBudget);
  workspace = changeWorkspaceEvent(workspace, first.id, addGuest);
  assert(workspace.events[0].budgets.some((b) => b.id === "new"));
  assert.equal(workspace.events[0].guestList.length, 1);
  assert.equal(workspace.events[1], other);
  assert.equal(first.guestList.length, 0);
  const twice = changeEventRecord(
    changeEventRecord(first, "tasks", first.tasks[0].id, (t) => ({
      ...t,
      done: !t.done,
    })),
    "tasks",
    first.tasks[0].id,
    (t) => ({ ...t, done: !t.done }),
  );
  assert.equal(twice.tasks[0].done, first.tasks[0].done);
  assert.throws(
    () => changeWorkspaceEvent(workspace, "missing", addBudget),
    /no longer/,
  );
  assert.throws(
    () =>
      changeWorkspaceEvent(workspace, first.id, (current) => ({
        ...current,
        id: "other",
      })),
    /identifier/,
  );
  assert.throws(
    () =>
      changeWorkspaceEvent(workspace, first.id, (current) => ({
        ...current,
        budget: -1,
      })),
    /Too small/,
  );
});

for (const [collection, entry] of Object.entries(entries)) {
  test(`${collection} commands reject stale/duplicate identities and enforce the schema's exact capacity`, () => {
    const original = { ...event(), [collection]: [] };
    const added = saveEventRecord(original, collection, entry, "create");
    assert.equal(original[collection].length, 0);
    assert.throws(
      () => saveEventRecord(added, collection, entry, "create"),
      /already exists/,
    );
    assert.throws(
      () => saveEventRecord(original, collection, entry, "edit"),
      /no longer exists/,
    );
    assert.throws(
      () => changeEventRecord(original, collection, entry.id, (x) => x),
      /no longer exists/,
    );
    assert.throws(
      () => removeEventRecord(original, collection, entry.id),
      /no longer exists/,
    );
    assert.throws(
      () =>
        changeEventRecord(added, collection, entry.id, (x) => ({
          ...x,
          id: "replacement",
        })),
      /identifier/,
    );
    const changed = saveEventRecord(added, collection, { ...entry }, "edit");
    assert.equal(changed[collection].length, 1);
    assert.equal(
      removeEventRecord(changed, collection, entry.id)[collection].length,
      0,
    );
    const full = {
      ...original,
      [collection]: Array.from(
        { length: RECORD_LIMITS[collection] },
        (_, i) => ({ ...entry, id: String(i) }),
      ),
    };
    assert.equal(eventSchema.safeParse(full).success, true);
    assert.throws(
      () => saveEventRecord(full, collection, entry, "create"),
      /up to/,
    );
    assert.equal(
      eventSchema.safeParse({
        ...full,
        [collection]: [...full[collection], entry],
      }).success,
      false,
    );
    assert.equal(
      saveEventRecord(full, collection, { ...entry, id: "0" }, "edit")[
        collection
      ].length,
      RECORD_LIMITS[collection],
    );
  });
}
