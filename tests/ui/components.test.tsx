import type { EventChange, CommandResult } from "../../src/lib/commands";
import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelPicker } from "../../src/components/ModelPicker";
import { Overview } from "../../src/pages/Overview";
import { PageBoundary } from "../../src/components/PageBoundary";
import { makeEvent, freeModel } from "./fixtures";

test("model search, free filter and selection expose the exact chosen route", async () => {
  const select = vi.fn(),
    close = vi.fn(),
    refresh = vi.fn();
  const paid = {
    ...freeModel,
    id: "provider/paid",
    name: "Paid planner",
    free: false,
    inputPrice: "0.000001",
    outputPrice: "0.000002",
  };
  render(
    <ModelPicker
      models={[freeModel, paid]}
      model={freeModel.id}
      catalogSource="live"
      loading={false}
      refresh={refresh}
      onSelect={select}
      onClose={close}
    />,
  );
  const user = userEvent.setup();
  expect(screen.getByText(/1.00 input/)).toBeVisible();
  await user.click(
    screen.getByRole("checkbox", { name: "Show free models only" }),
  );
  expect(screen.queryByText("Paid planner")).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("checkbox", { name: "Show free models only" }),
  );
  await user.type(screen.getByLabelText("Search models"), "no such model");
  expect(screen.getByText("No models match that search.")).toBeVisible();
  await user.clear(screen.getByLabelText("Search models"));
  await user.type(screen.getByLabelText("Search models"), "Paid planner");
  await user.click(screen.getByRole("button", { name: /Paid planner/ }));
  expect(select).toHaveBeenCalledWith(paid.id);
  expect(close).toHaveBeenCalledOnce();
  await user.click(
    screen.getByRole("button", { name: "Refresh model catalog" }),
  );
  expect(refresh).toHaveBeenCalledOnce();
});

test("overview actions route to the relevant planning view and retain independent task records", async () => {
  const event = makeEvent(),
    update = vi.fn<(change: EventChange) => CommandResult>(() => ({
      ok: true,
    })),
    navigate = vi.fn(),
    edit = vi.fn();
  render(
    <Overview
      event={event}
      onUpdate={update}
      notify={vi.fn()}
      navigate={navigate}
      onEdit={edit}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("checkbox")[0]!);
  expect(
    update.mock.calls[0]![0](event).tasks.filter(
      (task: { done: boolean }) => task.done,
    ),
  ).toHaveLength(1);
  for (const name of [
    "View all",
    "Add a task",
    "Manage budget",
    "See the full picture",
    "Find your inspiration",
    "Build my event plan",
    "Make the most of my budget",
    "Find a few thoughtful ideas",
    "Open AI planning studio",
  ]) {
    await user.click(screen.getByRole("button", { name }));
  }
  expect(navigate.mock.calls.flat()).toEqual(
    expect.arrayContaining(["timeline", "budget", "inspiration", "studio"]),
  );
  await user.click(screen.getByRole("button", { name: "View event details" }));
  await user.click(screen.getByRole("button", { name: "Edit event details" }));
  expect(edit).toHaveBeenCalledTimes(2);
});

test("page boundary recovers when navigating to another valid page", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken(): never {
    throw new Error("Synthetic failure");
  }
  const { rerender } = render(
    <PageBoundary resetKey="broken" onBackup={vi.fn()} onHome={vi.fn()}>
      <Broken />
    </PageBoundary>,
  );
  expect(screen.getByRole("alert")).toBeVisible();
  rerender(
    <PageBoundary resetKey="recovered" onBackup={vi.fn()} onHome={vi.fn()}>
      <h1>Working overview</h1>
    </PageBoundary>,
  );
  expect(
    screen.getByRole("heading", { name: "Working overview" }),
  ).toBeVisible();
});
