import { expect, test, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetPage } from "../../src/pages/Budget";
import { Timeline } from "../../src/pages/Timeline";
import { Vendors } from "../../src/pages/Vendors";
import { Guests } from "../../src/pages/Guests";
import { Inspiration } from "../../src/pages/Inspiration";
import { Guide } from "../../src/pages/Guide";
import { Overview } from "../../src/pages/Overview";
import { ToastNotification } from "../../src/components/ToastNotification";
import {
  COMMAND_OK,
  commandFailure,
  type EventPageProps,
  type UpdateEvent,
} from "../../src/lib/commands";
import { useEventRecords } from "../../src/lib/useEventRecords";
import { useToast } from "../../src/lib/useToast";
import { makeEvent } from "./fixtures";

const cases = [
  {
    name: "budget",
    view: (props: EventPageProps) => <BudgetPage {...props} />,
    open: "Add category",
    save: "Save category",
    fields: [["Category", "Transport"]],
  },
  {
    name: "timeline",
    view: (props: EventPageProps) => <Timeline {...props} />,
    open: "Add a task",
    save: "Add task",
    fields: [["Task name", "Check sound"]],
  },
  {
    name: "vendors",
    view: (props: EventPageProps) => <Vendors {...props} />,
    open: "Add a vendor",
    save: "Save vendor",
    fields: [["Vendor or business name", "Local team"]],
  },
  {
    name: "guests",
    view: (props: EventPageProps) => <Guests {...props} />,
    open: "Add guests",
    save: "Save guest",
    fields: [["Guest or household name", "Sample household"]],
  },
  {
    name: "ideas",
    view: (props: EventPageProps) => <Inspiration {...props} />,
    open: "Add an idea",
    save: "Save idea",
    fields: [
      ["Idea title", "Memory wall"],
      ["The details", "Everyone can contribute"],
    ],
  },
  {
    name: "agenda",
    view: (props: EventPageProps) => <Guide {...props} navigate={vi.fn()} />,
    open: "Add moment",
    save: "Save moment",
    fields: [["What is happening?", "Welcome guests"]],
  },
] satisfies {
  name: string;
  view: (props: EventPageProps) => React.ReactNode;
  open: string;
  save: string;
  fields: string[][];
}[];

for (const item of cases) {
  test(`${item.name} editor retains its draft and announces no success when a command is rejected; retry can close it`, async () => {
    const reject = vi.fn<UpdateEvent>(() => ({
      ok: false,
      error: "Synthetic storage rejection",
    }));
    const accept = vi.fn<UpdateEvent>(() => COMMAND_OK);
    const notify = vi.fn();
    const props = { event: makeEvent(), onUpdate: reject, notify };
    const { rerender } = render(item.view(props));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: item.open }));
    for (const [label, value] of item.fields) {
      if (!label || !value)
        throw new Error("A field fixture must have a label and value.");
      await user.type(screen.getByLabelText(label), value);
    }
    await user.click(screen.getByRole("button", { name: item.save }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Synthetic storage rejection",
    );
    expect(notify).not.toHaveBeenCalled();
    for (const [label, value] of item.fields) {
      if (!label) throw new Error("Missing field fixture label.");
      expect(screen.getByLabelText(label)).toHaveValue(value);
    }
    rerender(item.view({ ...props, onUpdate: accept }));
    await user.click(screen.getByRole("button", { name: item.save }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(notify).toHaveBeenCalledOnce();
  });
}

test("rejected removal keeps the confirmation visible without a success toast", async () => {
  const event = makeEvent(),
    notify = vi.fn();
  render(
    <BudgetPage
      event={event}
      onUpdate={() => ({
        ok: false,
        error: "The entry changed in another tab",
      })}
      notify={notify}
    />,
  );
  const first = event.budgets[0];
  if (!first) throw new Error("Expected a budget category.");
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: `Delete ${first.category}` }),
  );
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The entry changed in another tab",
  );
  expect(notify).not.toHaveBeenCalled();
});

test("a record command cannot save a closed editor, and rejected inline changes report an error", () => {
  const update = vi.fn<UpdateEvent>(() => ({
    ok: false,
    error: "Synthetic rejection",
  }));
  const notify = vi.fn();
  const { result } = renderHook(() =>
    useEventRecords("budgets", update, notify),
  );
  const entry = makeEvent().budgets[0];
  if (!entry) throw new Error("Expected a budget category.");
  act(() => {
    expect(result.current.save(entry, "Saved").ok).toBe(false);
  });
  expect(update).not.toHaveBeenCalled();
  act(() => {
    result.current.change(entry.id, (current) => current);
  });
  expect(notify).toHaveBeenCalledWith("Synthetic rejection", "error");
  expect(commandFailure("opaque", "Safe fallback")).toEqual({
    ok: false,
    error: "Safe fallback",
  });
});

test("overview completion reports a rejected command without changing the displayed task", async () => {
  const notify = vi.fn();
  render(
    <Overview
      event={makeEvent()}
      onUpdate={() => ({ ok: false, error: "Synthetic rejection" })}
      notify={notify}
      navigate={vi.fn()}
      onEdit={vi.fn()}
    />,
  );
  await userEvent.setup().click(screen.getAllByRole("checkbox")[0]!);
  expect(notify).toHaveBeenCalledWith("Synthetic rejection", "error");
  expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
});

test("the latest toast owns its lifetime, distinguishes errors and releases timers on unmount", () => {
  vi.useFakeTimers();
  try {
    const { result, unmount } = renderHook(useToast);
    act(() => result.current.notify("First"));
    act(() => vi.advanceTimersByTime(4000));
    act(() => result.current.notify("Rejected edit", "error"));
    act(() => vi.advanceTimersByTime(501));
    expect(result.current.toast).toEqual({
      message: "Rejected edit",
      tone: "error",
    });
    const view = render(<ToastNotification toast={result.current.toast} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Rejected edit");
    act(() => vi.advanceTimersByTime(3999));
    expect(result.current.toast).toBeNull();
    view.rerender(
      <ToastNotification toast={{ message: "Saved", tone: "success" }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => result.current.notify("Pending"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
