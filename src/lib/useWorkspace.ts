import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { loadWorkspace, STORAGE_KEY } from "./storage";
import { createWorkspaceRepository, WorkspaceConflict } from "./repository.ts";
import { workspaceSchema } from "./schemas.ts";
import type { Workspace } from "./types";

export function useWorkspace() {
  const [legacy] = useState(loadWorkspace);
  const [repository] = useState(() => createWorkspaceRepository());
  const [workspace, setWorkspaceState] = useState<Workspace>(legacy.workspace);
  const [ready, setReady] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [warning, setWarning] = useState(legacy.warning);
  const [recovery, setRecovery] = useState(legacy.recovery);
  const [blocked, setBlocked] = useState(Boolean(legacy.warning));
  const [status, setStatus] = useState("Opening saved workspace…");
  const revision = useRef(0);
  const current = useRef(workspace);
  const saved = useRef("");
  const stopped = useRef(blocked);
  const queue = useRef(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);
  const pending = useRef(0);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    current.current = workspace;
  }, [workspace]);

  // Apply functional commands synchronously so validation failures reach the caller.
  const installWorkspace = useCallback((action: SetStateAction<Workspace>) => {
    const next = workspaceSchema.parse(
      typeof action === "function" ? action(current.current) : action,
    );
    current.current = next;
    setWorkspaceState(next);
  }, []);
  const setWorkspace = useCallback(
    (action: SetStateAction<Workspace>) => {
      if (operation.current)
        throw new Error(
          "Wait for the workspace operation to finish before editing.",
        );
      installWorkspace(action);
    },
    [installWorkspace],
  );
  const hasDraft = () =>
    Boolean(
      document.querySelector(
        'dialog[open] form, [data-workspace-draft="true"]',
      ),
    );

  const reload = useCallback(async () => {
    if (operation.current) return false;
    try {
      if (hasDraft()) {
        setWarning(
          "Finish or cancel your open draft before loading saved data.",
        );
        return false;
      }
      operation.current = true;
      setBusy(true);
      const before = current.current;
      await queue.current;
      const record = await repository.load();
      if (current.current !== before)
        throw new Error("New edits are still in progress.");
      revision.current = record.revision;
      saved.current = JSON.stringify(record.workspace);
      stopped.current = false;
      setBlocked(false);
      setWarning("");
      setStatus("Saved on your device");
      setHasSavedData(true);
      installWorkspace(record.workspace);
      return true;
    } catch {
      setWarning(
        "Saved data could not be opened. Your current edits are still available to export.",
      );
      return false;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }, [repository, installWorkspace]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const record = await repository.load(
          legacy.warning ? undefined : legacy.workspace,
        );
        if (!active) return;
        revision.current = record.revision;
        saved.current = JSON.stringify(record.workspace);
        stopped.current = false;
        installWorkspace(record.workspace);
        setHasSavedData(true);
        setBlocked(false);
        setWarning("");
        setStatus("Saved on your device");
        // Never erase a different snapshot written by an older, still-open app tab.
        const differentLegacy =
          legacy.raw &&
          JSON.stringify(legacy.workspace) !== JSON.stringify(record.workspace);
        if (differentLegacy || legacy.recovery) {
          setRecovery(legacy.raw || legacy.recovery);
          setWarning(
            "A different older-format workspace is still preserved on this browser. This view uses the current database. Download the recovery data before deciding which backup to keep, and refresh older Gatherly tabs.",
          );
        }
        // Delete only an identical, successfully migrated legacy copy.
        if (!legacy.warning && !differentLegacy)
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* Canonical database is already committed. */
          }
      } catch {
        if (active) {
          stopped.current = true;
          setBlocked(true);
          setWarning(
            legacy.warning ||
              "Device storage is unavailable. Export your changes before leaving; they are currently in memory.",
          );
          setStatus("Not saved — export a backup");
        }
      } finally {
        if (active) setReady(true);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [repository, legacy, installWorkspace]);

  useEffect(() => {
    if (!ready || stopped.current) return;
    const serialized = JSON.stringify(workspace);
    if (serialized === saved.current) return;
    pending.current++;
    setStatus("Saving changes…");
    queue.current = queue.current
      .then(async () => {
        if (stopped.current) return;
        try {
          const record = await repository.save(workspace, revision.current);
          revision.current = record.revision;
          saved.current = serialized;
          channel.current?.postMessage({ revision: record.revision });
          if (JSON.stringify(current.current) === serialized)
            setStatus("Saved on your device");
        } catch (error) {
          stopped.current = true;
          setBlocked(true);
          setStatus("Unsaved edits — action needed");
          setWarning(
            error instanceof WorkspaceConflict
              ? error.message
              : "Your edits could not be saved. Export a backup before leaving; the previous saved workspace remains intact.",
          );
        }
      })
      .finally(() => {
        pending.current--;
      });
  }, [workspace, ready, repository]);

  useEffect(() => {
    const refresh = async () => {
      if (!ready || stopped.current) return;
      try {
        const record = await repository.load();
        if (record.revision <= revision.current) return;
        if (
          pending.current ||
          JSON.stringify(current.current) !== saved.current ||
          hasDraft()
        ) {
          stopped.current = true;
          setBlocked(true);
          setStatus("Unsaved edits — action needed");
          setWarning(new WorkspaceConflict(record).message);
          return;
        }
        revision.current = record.revision;
        saved.current = JSON.stringify(record.workspace);
        installWorkspace(record.workspace);
        setStatus("Updated from another tab");
      } catch {
        /* Saving reports storage failures without discarding the current view. */
      }
    };
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("gatherly.workspace.v2");
      channel.current.onmessage = () => {
        void refresh();
      };
    }
    const legacyChanged = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setRecovery(event.newValue);
        setWarning(
          "An older Gatherly tab saved a separate workspace. Download its recovery data and refresh older tabs; the current database has not been replaced.",
        );
      }
    };
    window.addEventListener("storage", legacyChanged);
    const focus = () => {
      void refresh();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        pending.current ||
        stopped.current ||
        hasDraft() ||
        JSON.stringify(current.current) !== saved.current
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("focus", focus);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", legacyChanged);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [ready, repository, installWorkspace]);

  const replace = useCallback(
    async (next: Workspace) => {
      if (operation.current) return false;
      operation.current = true;
      setBusy(true);
      try {
        const before = current.current;
        await queue.current;
        const record = await repository.load(next);
        if (current.current !== before)
          throw new Error("New edits are still in progress.");
        const committed = await repository.save(next, record.revision);
        revision.current = committed.revision;
        saved.current = JSON.stringify(committed.workspace);
        stopped.current = false;
        setBlocked(false);
        setWarning("");
        setStatus("Saved on your device");
        setHasSavedData(true);
        installWorkspace(committed.workspace);
        setRecovery(undefined);
        channel.current?.postMessage({ revision: committed.revision });
        // Remove only the old migration copy after an explicit recovery/import replacement.
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* Database remains the source of truth. */
        }
        return true;
      } catch {
        setWarning(
          "Replacement could not be saved. Export your current workspace and try again.",
        );
        return false;
      } finally {
        operation.current = false;
        setBusy(false);
      }
    },
    [repository, installWorkspace],
  );
  return {
    workspace,
    busy,
    setWorkspace,
    ready,
    warning,
    blocked,
    status,
    hasSavedData,
    recovery,
    reload,
    replace,
  };
}
