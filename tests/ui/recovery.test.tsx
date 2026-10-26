import { expect, test, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  renderHook,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { SettingsPage } from "../../src/pages/Settings";
import { useWorkspace } from "../../src/lib/useWorkspace";
import { createWorkspaceRepository } from "../../src/lib/repository.ts";
import { makeWorkspace } from "./fixtures";

function backupFile(read: () => Promise<string>, size = 100) {
  const file = new File(["backup"], "backup.json", {
    type: "application/json",
  });
  Object.defineProperties(file, {
    text: { value: read },
    size: { value: size },
  });
  return file;
}
function settings(onImport = vi.fn().mockResolvedValue(true)) {
  const workspace = makeWorkspace();
  render(
    <SettingsPage
      workspace={workspace}
      event={workspace.events[0]!}
      onImport={onImport}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      notify={vi.fn()}
    />,
  );
  return {
    input: screen.getByLabelText("Choose Gatherly backup file"),
    raw: JSON.stringify(workspace),
    onImport,
  };
}

test("a failed or oversized import clears an earlier valid candidate", async () => {
  const { input, raw, onImport } = settings();
  fireEvent.change(input, { target: { files: [backupFile(async () => raw)] } });
  await screen.findByText("Import 1 events?");
  fireEvent.change(input, {
    target: { files: [backupFile(async () => "{invalid")] },
  });
  await screen.findByRole("alert");
  expect(
    screen.queryByRole("button", { name: "Replace workspace" }),
  ).not.toBeInTheDocument();
  fireEvent.change(input, {
    target: { files: [backupFile(async () => raw, 25_000_001)] },
  });
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/under 25 MB/),
  );
  expect(onImport).not.toHaveBeenCalled();
});

test("slower previous file reads cannot replace the newest chosen backup", async () => {
  const { input, raw } = settings();
  let finishFirst: (value: string) => void = () => {};
  fireEvent.change(input, {
    target: {
      files: [
        backupFile(
          () =>
            new Promise((resolve) => {
              finishFirst = resolve;
            }),
        ),
      ],
    },
  });
  fireEvent.change(input, {
    target: { files: [backupFile(async () => "invalid")] },
  });
  await screen.findByRole("alert");
  await act(async () => finishFirst(raw));
  expect(
    screen.queryByRole("button", { name: "Replace workspace" }),
  ).not.toBeInTheDocument();
});

test("failed persistence retains the reviewed backup for retry and reports success only after commit", async () => {
  const onImport = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const { input, raw } = settings(onImport);
  const user = userEvent.setup();
  fireEvent.change(input, { target: { files: [backupFile(async () => raw)] } });
  await user.click(
    await screen.findByRole("button", { name: "Replace workspace" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("not saved");
  expect(
    screen.getByRole("button", { name: "Replace workspace" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Replace workspace" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Replace workspace" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onImport).toHaveBeenCalledTimes(2);
});

test("queued functional edits commit together and survive a fresh repository read", async () => {
  const factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  vi.stubGlobal("BroadcastChannel", undefined);
  const { result } = renderHook(useWorkspace);
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => {
    result.current.setWorkspace((w) => ({
      ...w,
      events: w.events.map((event, index) =>
        index ? event : { ...event, title: "Both edits retained" },
      ),
    }));
    result.current.setWorkspace((w) => ({
      ...w,
      events: w.events.map((event, index) =>
        index ? event : { ...event, location: "New venue" },
      ),
    }));
  });
  await waitFor(() =>
    expect(result.current.status).toBe("Saved on your device"),
  );
  const repository = createWorkspaceRepository(factory);
  const saved = await repository.load();
  expect(saved.workspace.events[0]).toMatchObject({
    title: "Both edits retained",
    location: "New venue",
  });
  await repository.close();
});

test("a stale tab keeps its edits exportable, preserves the remote commit and can explicitly reload", async () => {
  const factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  vi.stubGlobal("BroadcastChannel", undefined);
  const { result } = renderHook(useWorkspace);
  await waitFor(() => expect(result.current.ready).toBe(true));
  const other = createWorkspaceRepository(factory);
  const latest = await other.load();
  latest.workspace.events[0]!.title = "Saved in another tab";
  await other.save(latest.workspace, latest.revision);
  act(() =>
    result.current.setWorkspace((w) => ({
      ...w,
      events: w.events.map((event, index) =>
        index ? event : { ...event, title: "Unsaved local edit" },
      ),
    })),
  );
  await waitFor(() => expect(result.current.blocked).toBe(true));
  expect(result.current.workspace.events[0]!.title).toBe("Unsaved local edit");
  expect((await other.load()).workspace.events[0]!.title).toBe(
    "Saved in another tab",
  );
  await act(async () => {
    expect(await result.current.reload()).toBe(true);
  });
  expect(result.current.workspace.events[0]!.title).toBe(
    "Saved in another tab",
  );
  expect(result.current.blocked).toBe(false);
  await other.close();
});

test("unsaved inline drafts protect against unload and automatic cross-tab replacement", async () => {
  const factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  vi.stubGlobal("BroadcastChannel", undefined);
  const { result } = renderHook(useWorkspace);
  await waitFor(() => expect(result.current.ready).toBe(true));
  const draft = document.createElement("form");
  draft.dataset.workspaceDraft = "true";
  document.body.append(draft);
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  const other = createWorkspaceRepository(factory);
  const latest = await other.load();
  latest.workspace.events[0]!.title = "Another tab";
  await other.save(latest.workspace, latest.revision);
  window.dispatchEvent(new Event("focus"));
  await waitFor(() => expect(result.current.blocked).toBe(true));
  expect(result.current.workspace.events[0]!.title).not.toBe("Another tab");
  await act(async () => {
    expect(await result.current.reload()).toBe(false);
  });
  draft.remove();
  await act(async () => {
    expect(await result.current.reload()).toBe(true);
  });
  await other.close();
});

test("unavailable storage exposes recovery, preserves in-memory changes and never claims replacement success", async () => {
  vi.stubGlobal("indexedDB", undefined);
  vi.stubGlobal("BroadcastChannel", undefined);
  const { result } = renderHook(useWorkspace);
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.blocked).toBe(true);
  expect(result.current.status).toMatch(/Not saved/);
  const before = result.current.workspace;
  await act(async () => {
    expect(await result.current.replace(makeWorkspace())).toBe(false);
  });
  expect(result.current.workspace).toBe(before);
  expect(result.current.warning).toMatch(/could not be saved/);
});
