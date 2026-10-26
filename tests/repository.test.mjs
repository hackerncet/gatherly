import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  createWorkspaceRepository,
  WorkspaceConflict,
} from "../src/lib/repository.ts";
import { eventFromPlan } from "../src/lib/domain.ts";
const makeWorkspace = () => {
  const event = eventFromPlan({
    title: "Concurrent event",
    type: "community",
    date: "2027-04-20",
    location: "Bengaluru",
    guests: 40,
    budget: 60000,
    currency: "INR",
    preferences: "",
  });
  return { version: 1, activeId: event.id, events: [event] };
};
test("migration and database re-open preserve complete event records", async () => {
  const factory = new IDBFactory();
  const repository = createWorkspaceRepository(factory);
  const initial = makeWorkspace();
  initial.events[0].budgets[0].paid = 1234;
  const loaded = await repository.load(initial);
  assert.equal(loaded.revision, 0);
  await repository.close();
  const reopened = createWorkspaceRepository(factory);
  const actual = await reopened.load();
  assert.deepEqual(actual.workspace, initial);
  await reopened.close();
});
test("stale tab cannot silently overwrite a newer task with its payment edit", async () => {
  const factory = new IDBFactory();
  const a = createWorkspaceRepository(factory);
  const b = createWorkspaceRepository(factory);
  const initial = await a.load(makeWorkspace());
  const stale = await b.load();
  initial.workspace.events[0].tasks.push({
    id: "new-task",
    title: "Keep this task",
    date: "2027-04-10",
    category: "Safety",
    done: false,
  });
  await a.save(initial.workspace, initial.revision);
  stale.workspace.events[0].budgets[0].paid = 1000;
  await assert.rejects(
    () => b.save(stale.workspace, stale.revision),
    (e) =>
      e instanceof WorkspaceConflict &&
      e.latest.workspace.events[0].tasks.some((t) => t.id === "new-task"),
  );
  assert.ok(
    (await a.load()).workspace.events[0].tasks.some((t) => t.id === "new-task"),
  );
  assert.equal(
    stale.workspace.events[0].budgets[0].paid,
    1000,
    "local conflicting edits remain available to export",
  );
  await a.close();
  await b.close();
});
test("atomic transactions permit exactly one of twenty same-revision writers", async () => {
  const factory = new IDBFactory();
  const repository = createWorkspaceRepository(factory);
  const initial = await repository.load(makeWorkspace());
  const outcomes = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      repository.save(initial.workspace, initial.revision),
    ),
  );
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(
    outcomes
      .filter((r) => r.status === "rejected")
      .every((r) => r.reason instanceof WorkspaceConflict),
  );
  assert.equal((await repository.load()).revision, 1);
  await repository.close();
});
test("invalid replacement aborts transaction and retains previous saved data", async () => {
  const repository = createWorkspaceRepository(new IDBFactory());
  const initial = await repository.load(makeWorkspace());
  const invalid = structuredClone(initial.workspace);
  invalid.events[0].title = "";
  await assert.rejects(() => repository.save(invalid, initial.revision));
  assert.deepEqual(await repository.load(), initial);
  await repository.close();
});
test("unavailable or uninitialized storage fails without pretending data was saved", async () => {
  await assert.rejects(() =>
    createWorkspaceRepository(null).load(makeWorkspace()),
  );
  const repository = createWorkspaceRepository(new IDBFactory());
  await assert.rejects(() => repository.load());
  await repository.close();
});

test("a blocked opening is retryable and its late connection cannot poison the next opening", async () => {
  const real = new IDBFactory();
  let calls = 0;
  const factory = {
    open(...args) {
      const request = real.open(...args);
      if (++calls === 1)
        queueMicrotask(() => request.onblocked?.(new Event("blocked")));
      return request;
    },
  };
  const repository = createWorkspaceRepository(factory, "blocked-recovery");
  await assert.rejects(() => repository.load(makeWorkspace()), /Close older/);
  const restored = await repository.load(makeWorkspace());
  assert.equal(restored.workspace.events.length, 1);
  assert.equal(calls, 2);
  await repository.close();
});

test("a connection closed on versionchange is reopened before the next read", async () => {
  const real = new IDBFactory();
  let database;
  let calls = 0;
  const factory = {
    open(...args) {
      calls++;
      const request = real.open(...args);
      request.addEventListener("success", () => {
        database = request.result;
      });
      return request;
    },
  };
  const repository = createWorkspaceRepository(
    factory,
    "versionchange-recovery",
  );
  const first = await repository.load(makeWorkspace());
  database.onversionchange();
  assert.deepEqual(await repository.load(), first);
  assert.equal(calls, 2);
  await repository.close();
});
