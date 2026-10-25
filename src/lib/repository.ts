import { z } from "zod";
import { workspaceSchema } from "./domain.ts";
import type { Workspace } from "./types.ts";

const recordSchema = z.object({
  revision: z.number().int().nonnegative(),
  workspace: workspaceSchema,
});
export type WorkspaceRecord = z.infer<typeof recordSchema>;
export class WorkspaceConflict extends Error {
  readonly latest: WorkspaceRecord;
  constructor(latest: WorkspaceRecord) {
    super(
      "Another tab saved newer changes. Your local workspace has been kept. Finish any open form, then export your edits before loading the latest saved workspace.",
    );
    this.name = "WorkspaceConflict";
    this.latest = latest;
  }
}

/** IndexedDB serializes read/write transactions across tabs: compare and write are atomic. */
export function createWorkspaceRepository(
  factory: IDBFactory = globalThis.indexedDB,
  name = "gatherly.local.v2",
) {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () =>
    (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!factory) {
        reject(
          new Error(
            "Local database unavailable. Export your workspace before leaving.",
          ),
        );
        return;
      }
      const request = factory.open(name, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onerror = () => {
        connection = undefined;
        reject(request.error);
      };
      request.onblocked = () =>
        reject(new Error("Close older Gatherly tabs to open saved data."));
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    }));
  async function transact(
    initial: Workspace | undefined,
    next?: { workspace: Workspace; expected: number },
  ): Promise<WorkspaceRecord> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("workspace", "readwrite");
      const store = transaction.objectStore("workspace");
      const request = store.get("current");
      let record: WorkspaceRecord;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const value: unknown = request.result;
          if (value === undefined) {
            if (!initial)
              throw new Error(
                "Choose a valid backup or explicitly save the recovery workspace first.",
              );
            record = { revision: 0, workspace: workspaceSchema.parse(initial) };
            store.put(record, "current");
          } else record = recordSchema.parse(value);
          if (next) {
            if (record.revision !== next.expected)
              throw new WorkspaceConflict(record);
            record = {
              revision: record.revision + 1,
              workspace: workspaceSchema.parse(next.workspace),
            };
            store.put(record, "current");
          }
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(record);
      transaction.onabort = () =>
        reject(
          failure ||
            transaction.error ||
            new Error("Workspace save was interrupted."),
        );
      transaction.onerror = () => {
        failure ??= transaction.error;
      };
    });
  }
  return {
    load: (initial?: Workspace) => transact(initial),
    save: (workspace: Workspace, expected: number) =>
      transact(undefined, { workspace, expected }),
    close: async () => {
      if (connection) (await connection).close();
      connection = undefined;
    },
  };
}
