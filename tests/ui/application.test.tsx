import { expect, test, vi } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import App from "../../src/App";
import { freeModel, json, makeWorkspace } from "./fixtures";

test("complete local planning journey creates, edits, searches, previews, saves, imports and removes events", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) =>
      json(
        url.endsWith("/health")
          ? {
              status: "ok",
              aiEnabled: false,
              version: "1.2.0",
              storage: "browser-local",
            }
          : { source: "fallback", models: [freeModel] },
      ),
    ),
  );
  location.hash = "overview";
  render(<App />);
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: /Good things are coming/ });
  await user.click(screen.getByRole("button", { name: "New event" }));
  await user.click(screen.getByRole("button", { name: /Birthday/ }));
  await user.type(screen.getByLabelText("Event name"), "Birthday journey");
  await user.type(screen.getByLabelText("Location"), "Bengaluru");
  await user.click(screen.getByRole("button", { name: "Create my event" }));
  expect(
    await screen.findByRole("heading", { name: "Birthday journey" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "View event details" }));
  await user.clear(screen.getByLabelText("Event name"));
  await user.type(
    screen.getByLabelText("Event name"),
    "Birthday journey updated",
  );
  await user.click(screen.getByRole("button", { name: "Save event" }));
  expect(
    await screen.findByRole("heading", { name: "Birthday journey updated" }),
  ).toBeVisible();
  await user.click(screen.getAllByRole("checkbox", { name: /Complete/ })[0]!);
  await user.type(screen.getByLabelText("Search this event"), "cake");
  const searchResults = screen.getByRole("button", {
    name: /Book the cake and food/,
  });
  await user.click(searchResults);
  expect(
    await screen.findByRole("heading", { name: "A little closer, every day." }),
  ).toBeVisible();
  expect(document.title).toBe("Timeline · Gatherly");
  for (const [button, heading] of [
    ["Budget", "More moments. Less money stress."],
    ["Vendors", "Your dream team, coming together."],
    ["Guest list", "A place for everyone you love."],
    ["Inspiration", "A celebration that feels like you."],
    ["Event guide", "The plan for the day."],
  ] as const) {
    await user.click(
      screen.getByRole("button", { name: new RegExp(`^${button}`) }),
    );
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  }
  await user.click(screen.getByRole("button", { name: /^AI planning studio/ }));
  await screen.findByRole("heading", { name: "Dream it. Let’s plan it." });
  await user.click(
    screen.getByRole("button", { name: /Make it eco-friendly/ }),
  );
  await user.click(
    screen.getByRole("button", { name: "Build my starter plan" }),
  );
  expect(await screen.findByText("CURATED STARTER PLAN")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Create a new event with this plan" }),
  );
  await screen.findByRole("heading", {
    name: /Birthday journey updated · new plan/,
  });
  await user.click(screen.getByRole("button", { name: "A helping hand" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Plans are saved only in this browser",
  );
  await user.click(screen.getByRole("button", { name: "Close dialog" }));
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Timeline",
    }),
  );
  await screen.findByRole("heading", { name: "A little closer, every day." });
  await user.click(screen.getByRole("button", { name: "Settings & data" }));
  await screen.findByRole("heading", { name: "Your space. Your plans." });
  await user.click(screen.getByRole("button", { name: "Export backup" }));
  await user.click(screen.getByRole("button", { name: "Delete event" }));
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Active event" }),
    ).not.toHaveTextContent(/new plan/),
  );
  console.info(
    "Journey: create preview, help, navigation and delete completed",
  );
  const incoming = makeWorkspace();
  const file = new File(["backup"], "backup.json");
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(incoming),
  });
  fireEvent.change(screen.getByLabelText("Choose Gatherly backup file"), {
    target: { files: [file] },
  });
  await user.click(
    await screen.findByRole("button", { name: "Replace workspace" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Active event" })).toHaveValue(
      incoming.activeId,
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Saving your workspace. Please wait…"),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Delete event" })).toBeDisabled();
}, 20000);
