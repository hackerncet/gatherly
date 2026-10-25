import { useState } from "react";
import App from "../../src/App";
import { IDBFactory } from "fake-indexeddb";
import { describe, test, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { EventForm } from "../../src/components/EventForm";
import { Modal } from "../../src/components/ui";
import { Guide } from "../../src/pages/Guide";
import { PageBoundary } from "../../src/components/PageBoundary";
import { Studio } from "../../src/pages/Studio";
import { BudgetPage } from "../../src/pages/Budget";
import { Timeline } from "../../src/pages/Timeline";
import { Vendors } from "../../src/pages/Vendors";
import { Guests } from "../../src/pages/Guests";
import { Inspiration } from "../../src/pages/Inspiration";
import { SettingsPage } from "../../src/pages/Settings";
import { Overview } from "../../src/pages/Overview";
import { eventFromPlan, starterPlan } from "../../src/lib/domain.ts";
import { apiJson, healthSchema } from "../../src/lib/api.ts";

const brief = {
  title: "A community afternoon",
  type: "community" as const,
  date: "2027-05-15",
  location: "Bengaluru",
  guests: 40,
  budget: 60000,
  currency: "INR" as const,
  preferences: "Step-free, vegetarian and outdoor",
};
const makeEvent = () => eventFromPlan(brief);
const notify = vi.fn();
const navigate = vi.fn();

test("complete application shell initializes saved data and has valid accessible structure", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          aiEnabled: false,
          version: "1.1.0",
          storage: "browser-local",
        }),
      ),
    ),
  );
  render(<App />);
  await screen.findByRole("heading", { name: /Good things are coming/ });
  const result = await axe.run(document.body, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.html),
    })),
  ).toEqual([]);
});

describe("accessible event form", () => {
  test("keyboard entry creates a valid birthday brief", async () => {
    const save = vi.fn();
    render(<EventForm onSave={save} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Birthday/ }));
    await user.type(screen.getByLabelText("Event name"), "Birthday picnic");
    await user.type(screen.getByLabelText("Location"), "Bengaluru");
    await user.click(screen.getByRole("button", { name: "Create my event" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Birthday picnic",
        type: "birthday",
        location: "Bengaluru",
      }),
      false,
    );
  });
  test("edit keeps the rescheduling option explicit and cancel performs no save", async () => {
    const save = vi.fn(),
      cancel = vi.fn();
    render(<EventForm initial={brief} onSave={save} onCancel={cancel} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save event" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ title: brief.title }),
      false,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
  });
  test("schema validation catches whitespace-only names", async () => {
    render(<EventForm initial={brief} onSave={vi.fn()} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Event name"));
    await user.type(screen.getByLabelText("Event name"), "   ");
    await user.click(screen.getByRole("button", { name: "Save event" }));
    expect(screen.getByRole("alert")).toBeVisible();
  });
});

test("modal focus wraps in both directions and close restores the opener", async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open planner</button>
        {open && (
          <Modal title="Edit details" onClose={() => setOpen(false)}>
            <label>
              Event title
              <input />
            </label>
            <button onClick={() => setOpen(false)}>Save details</button>
          </Modal>
        )}
      </>
    );
  }
  render(<Harness />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Open planner" }));
  expect(screen.getByLabelText("Event title")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Save details" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Save details" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Save details" }));
  expect(screen.getByRole("button", { name: "Open planner" })).toHaveFocus();
});

test("day-of schedule supports add, edit, delete, cancel and download links", async () => {
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL() {
        return "blob:calendar";
      }
      static revokeObjectURL() {}
    },
  );

  function Harness() {
    const [event, setEvent] = useState(makeEvent);
    return (
      <Guide
        event={event}
        onUpdate={setEvent}
        navigate={navigate}
        notify={notify}
      />
    );
  }
  render(<Harness />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add moment" }));
  fireEvent.input(screen.getByLabelText("Time at the venue"), {
    target: { value: "15:30" },
  });
  await user.type(screen.getByLabelText("What is happening?"), "Doors open");
  await user.type(
    screen.getByLabelText("Responsible person or team"),
    "Volunteers",
  );
  await user.click(screen.getByRole("button", { name: "Save moment" }));
  expect(screen.getByText("Doors open")).toBeVisible();
  expect(screen.getByText("15:30")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Edit Doors open" }));
  await user.clear(screen.getByLabelText("What is happening?"));
  fireEvent.input(screen.getByLabelText("Time at the venue"), {
    target: { value: "15:30" },
  });
  await user.type(
    screen.getByLabelText("What is happening?"),
    "Welcome guests",
  );
  await user.click(screen.getByRole("button", { name: "Save moment" }));
  expect(screen.getByText("Welcome guests")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add moment" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("link", { name: "Export calendar" })).toHaveAttribute(
    "download",
    "gatherly-calendar.ics",
  );
  expect(screen.getByRole("link", { name: "Event brief" })).toHaveAttribute(
    "download",
    "gatherly-event-brief.md",
  );
  await user.click(
    screen.getByRole("button", { name: "Delete Welcome guests" }),
  );
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(screen.queryByText("Welcome guests")).not.toBeInTheDocument();
});

test("page failure retains export and navigation recovery", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken() {
    throw new Error("synthetic view failure");
  }
  const backup = vi.fn(),
    home = vi.fn();
  render(
    <PageBoundary resetKey="one" onBackup={backup} onHome={home}>
      <Broken />
    </PageBoundary>,
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Export workspace backup" }),
  );
  await user.click(screen.getByRole("button", { name: "Return to overview" }));
  expect(backup).toHaveBeenCalledOnce();
  expect(home).toHaveBeenCalledOnce();
});

test("typed API client rejects invalid success bodies and preserves safe server errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response('{"status":"ok"}'))
      .mockResolvedValueOnce(
        new Response('{"error":"Enter the private access code"}', {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          '{"status":"ok","aiEnabled":false,"version":"1.1.0","storage":"browser-local"}',
        ),
      ),
  );
  await expect(apiJson("/api/health", healthSchema)).rejects.toThrow(
    /unexpected/,
  );
  await expect(apiJson("/api/health", healthSchema)).rejects.toThrow(
    /private access/,
  );
  await expect(apiJson("/api/health", healthSchema)).resolves.toMatchObject({
    aiEnabled: false,
  });
});

const renderCases = [
  [
    "Overview",
    () => (
      <Overview
        event={makeEvent()}
        onUpdate={vi.fn()}
        navigate={navigate}
        onEdit={vi.fn()}
      />
    ),
  ],
  [
    "Budget",
    () => <BudgetPage event={makeEvent()} onUpdate={vi.fn()} notify={notify} />,
  ],
  [
    "Timeline",
    () => <Timeline event={makeEvent()} onUpdate={vi.fn()} notify={notify} />,
  ],
  [
    "Vendors",
    () => <Vendors event={makeEvent()} onUpdate={vi.fn()} notify={notify} />,
  ],
  [
    "Guests",
    () => <Guests event={makeEvent()} onUpdate={vi.fn()} notify={notify} />,
  ],
  [
    "Inspiration",
    () => (
      <Inspiration event={makeEvent()} onUpdate={vi.fn()} notify={notify} />
    ),
  ],
  [
    "Guide",
    () => (
      <Guide
        event={makeEvent()}
        onUpdate={vi.fn()}
        notify={notify}
        navigate={navigate}
      />
    ),
  ],
  [
    "Settings",
    () => {
      const event = makeEvent();
      return (
        <SettingsPage
          event={event}
          workspace={{ version: 1, events: [event], activeId: event.id }}
          onImport={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          notify={notify}
        />
      );
    },
  ],
  [
    "AI Studio",
    () => (
      <Studio
        event={makeEvent()}
        aiEnabled={false}
        serviceMessage="Starter mode is ready."
        refreshStatus={vi.fn()}
        onCreate={vi.fn()}
        notify={notify}
      />
    ),
  ],
] as const;
for (const [name, view] of renderCases)
  test(`${name} has no axe structural accessibility violations`, async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            source: "fallback",
            models: [
              {
                id: "openrouter/free",
                name: "Free router",
                free: true,
                contextLength: 0,
                inputPrice: "0",
                outputPrice: "0",
              },
            ],
          }),
        ),
      ),
    );
    render(<main>{view()}</main>);
    if (name === "AI Studio")
      await waitFor(() =>
        expect(screen.queryByText("Loading catalog…")).not.toBeInTheDocument(),
      );
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html),
      })),
    ).toEqual([]);
  });

test("migration keeps a differing older-tab workspace exportable instead of erasing it", async () => {
  const { createWorkspaceRepository } =
    await import("../../src/lib/repository");
  const { STORAGE_KEY } = await import("../../src/lib/storage");
  const factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  const event = makeEvent();
  const canonical = {
    version: 1 as const,
    activeId: event.id,
    events: [event],
  };
  const repository = createWorkspaceRepository(factory);
  await repository.load(canonical);
  const old = structuredClone(canonical);
  old.events[0].title = "Changes from an older application tab";
  const raw = JSON.stringify(old);
  localStorage.setItem(STORAGE_KEY, raw);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          aiEnabled: false,
          version: "1.1.0",
          storage: "browser-local",
        }),
      ),
    ),
  );
  render(<App />);
  await screen.findByRole("button", { name: "Download recovery data" });
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  expect(screen.getByRole("combobox", { name: "Active event" })).toHaveValue(
    event.id,
  );
  expect(screen.getAllByText(brief.title).length).toBeGreaterThan(0);
  await repository.close();
});

test("authenticated AI preview preserves model provenance and creates a separate event", async () => {
  const create = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/models")
              ? {
                  source: "live",
                  models: [
                    {
                      id: "openrouter/free",
                      name: "Free router",
                      free: true,
                      contextLength: 0,
                      inputPrice: "0",
                      outputPrice: "0",
                    },
                  ],
                }
              : {
                  source: "ai",
                  model: "provider/actual-model",
                  plan: starterPlan(brief),
                },
          ),
        ),
    ),
  );
  const original = makeEvent();
  render(
    <Studio
      event={original}
      aiEnabled={true}
      serviceMessage="Live AI is configured."
      refreshStatus={vi.fn()}
      onCreate={create}
      notify={notify}
    />,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText(/Private AI access code/),
    "test-session-code-1234",
  );
  await user.click(screen.getByRole("checkbox", { name: /I agree to send/ }));
  await user.click(
    screen.getByRole("button", { name: "Generate my event plan" }),
  );
  expect(await screen.findByText("GENERATED WITH AI")).toBeVisible();
  expect(screen.getByText("Model: provider/actual-model")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Your vendor selection checklist" }),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: /Create a new event with this plan/ }),
  );
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      provenance: expect.objectContaining({
        source: "ai",
        model: "provider/actual-model",
      }),
    }),
  );
  expect(create.mock.calls[0][0].id).not.toBe(original.id);
  expect(original.title).toBe(brief.title);
});

test("AI provider failure is shown without changing the original event", async () => {
  const create = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) =>
      url.endsWith("/models")
        ? new Response(
            JSON.stringify({
              source: "fallback",
              models: [
                {
                  id: "openrouter/free",
                  name: "Free router",
                  free: true,
                  contextLength: 0,
                  inputPrice: "0",
                  outputPrice: "0",
                },
              ],
            }),
          )
        : new Response(
            JSON.stringify({ error: "The AI provider needs credits." }),
            { status: 502 },
          ),
    ),
  );
  render(
    <Studio
      event={makeEvent()}
      aiEnabled={true}
      serviceMessage="Live AI is configured."
      refreshStatus={vi.fn()}
      onCreate={create}
      notify={notify}
    />,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText(/Private AI access code/),
    "test-session-code-1234",
  );
  await user.click(screen.getByRole("checkbox", { name: /I agree to send/ }));
  await user.click(
    screen.getByRole("button", { name: "Generate my event plan" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The AI provider needs credits.",
  );
  expect(create).not.toHaveBeenCalled();
});
