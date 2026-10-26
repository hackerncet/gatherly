import { useState } from "react";
import { expect, test, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetPage } from "../../src/pages/Budget";
import { Timeline } from "../../src/pages/Timeline";
import { Vendors } from "../../src/pages/Vendors";
import { Guests } from "../../src/pages/Guests";
import { Inspiration } from "../../src/pages/Inspiration";
import { makeEvent } from "./fixtures";
import type { Event } from "../../src/lib/types";

function Records({
  page,
  initial = makeEvent(),
}: {
  page: "budget" | "timeline" | "vendors" | "guests" | "inspiration";
  initial?: Event;
}) {
  const [event, onUpdate] = useState(initial);
  const common = { event, onUpdate, notify: vi.fn() };
  return {
    budget: <BudgetPage {...common} />,
    timeline: <Timeline {...common} />,
    vendors: <Vendors {...common} />,
    guests: <Guests {...common} />,
    inspiration: <Inspiration {...common} />,
  }[page];
}

test("budget category validation focuses the associated field; add, edit and confirmed removal preserve totals", async () => {
  render(<Records page="budget" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add category" }));
  await user.type(screen.getByLabelText("Category"), "   ");
  await user.click(screen.getByRole("button", { name: "Save category" }));
  expect(screen.getByLabelText("Category")).toHaveFocus();
  expect(screen.getByLabelText("Category")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const alert = screen.getByRole("alert");
  expect(screen.getByLabelText("Category")).toHaveAttribute(
    "aria-describedby",
    alert.id,
  );
  await user.clear(screen.getByLabelText("Category"));
  await user.type(screen.getByLabelText("Category"), "Transport");
  fireEvent.change(screen.getByLabelText("Planned (INR)"), {
    target: { value: "1200" },
  });
  fireEvent.change(screen.getByLabelText("Paid (INR)"), {
    target: { value: "400" },
  });
  await user.click(screen.getByRole("button", { name: "Save category" }));
  await user.click(screen.getByRole("button", { name: "Edit Transport" }));
  fireEvent.change(screen.getByLabelText("Paid (INR)"), {
    target: { value: "1500" },
  });
  await user.click(screen.getByRole("button", { name: "Save category" }));
  expect(screen.getByRole("row", { name: /Transport/ })).toHaveTextContent(
    "Fully paid",
  );
  await user.click(screen.getByRole("button", { name: "Delete Transport" }));
  await user.click(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.getByText("Transport")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Delete Transport" }));
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(screen.queryByText("Transport")).not.toBeInTheDocument();
});

test("task add, edit, filters, completion and removal retain the chosen date", async () => {
  const event = makeEvent();
  event.tasks = [];
  render(<Records page="timeline" initial={event} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add a task" }));
  await user.type(screen.getByLabelText("Task name"), "Check sound");
  fireEvent.change(screen.getByLabelText("Due date"), {
    target: { value: "2027-05-10" },
  });
  await user.click(screen.getByRole("button", { name: "Add task" }));
  await user.click(screen.getByRole("button", { name: "Edit Check sound" }));
  await user.clear(screen.getByLabelText("Task name"));
  await user.type(screen.getByLabelText("Task name"), "Check microphones");
  await user.click(screen.getByRole("button", { name: "Save task" }));
  await user.click(
    screen.getByRole("checkbox", { name: "Mark Check microphones complete" }),
  );
  await user.click(screen.getByRole("button", { name: "To do" }));
  expect(screen.queryByText("Check microphones")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Completed" }));
  expect(screen.getByText("Check microphones")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Delete Check microphones" }),
  );
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(screen.queryByText("Check microphones")).not.toBeInTheDocument();
});

test("vendor edit, checklist and filters operate only on the selected vendor", async () => {
  const event = makeEvent();
  event.vendors = [];
  render(<Records page="vendors" initial={event} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add a vendor" }));
  await user.type(
    screen.getByLabelText("Vendor or business name"),
    "Local caterer",
  );
  await user.type(
    screen.getByLabelText(/Contact details/),
    "Public business contact",
  );
  await user.type(screen.getByLabelText("Notes"), "Written quote required");
  await user.click(screen.getByRole("button", { name: "Save vendor" }));
  await user.click(screen.getByRole("checkbox", { name: "Quote received" }));
  await user.click(screen.getByRole("button", { name: "Edit Local caterer" }));
  expect(screen.getByLabelText(/Contact details/)).toHaveValue(
    "Public business contact",
  );
  await user.selectOptions(screen.getByLabelText("Status"), "booked");
  fireEvent.change(screen.getByLabelText("Quoted amount (INR)"), {
    target: { value: "8000" },
  });
  await user.click(screen.getByRole("button", { name: "Save vendor" }));
  expect(
    screen.getByRole("checkbox", { name: "Quote received" }),
  ).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Shortlisted" }));
  expect(
    screen.queryByRole("heading", { name: "Local caterer" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Booked" }));
  await user.click(
    screen.getByRole("button", { name: "Delete Local caterer" }),
  );
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(
    screen.queryByRole("heading", { name: "Local caterer" }),
  ).not.toBeInTheDocument();
});

test("guest household counts, inline RSVP, search and editing preserve private notes", async () => {
  render(<Records page="guests" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add guests" }));
  await user.type(
    screen.getByLabelText("Guest or household name"),
    "Sample household",
  );
  fireEvent.change(screen.getByLabelText("Party size"), {
    target: { value: "3" },
  });
  await user.type(
    screen.getByLabelText(/Dietary or accessibility needs/),
    "Vegan choices",
  );
  await user.click(screen.getByRole("button", { name: "Save guest" }));
  await user.selectOptions(
    screen.getByLabelText("RSVP for Sample household"),
    "confirmed",
  );
  await user.click(screen.getByRole("button", { name: "Pending" }));
  expect(screen.queryByText("Sample household")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirmed" }));
  await user.type(screen.getByLabelText("Search guests"), "not a match");
  expect(screen.queryByText("Sample household")).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText("Search guests"));
  await user.click(
    screen.getByRole("button", { name: "Edit Sample household" }),
  );
  expect(screen.getByLabelText(/Dietary or accessibility needs/)).toHaveValue(
    "Vegan choices",
  );
  await user.click(screen.getByRole("button", { name: "Save guest" }));
  await user.click(
    screen.getByRole("button", { name: "Delete Sample household" }),
  );
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(screen.queryByText("Sample household")).not.toBeInTheDocument();
});

test("custom idea validation, save filter, unsave and deletion are reversible until confirmed", async () => {
  const event = makeEvent();
  event.ideas = [];
  render(<Records page="inspiration" initial={event} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add an idea" }));
  await user.type(screen.getByLabelText("Idea title"), "Memory booth");
  await user.type(
    screen.getByLabelText("The details"),
    "Invite everyone to record a memory",
  );
  await user.click(screen.getByRole("button", { name: "Save idea" }));
  await user.click(screen.getByRole("button", { name: /Saved ideas/ }));
  await user.click(screen.getByRole("button", { name: "Unsave Memory booth" }));
  expect(
    screen.queryByRole("heading", { name: "Memory booth" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /All ideas/ }));
  await user.click(screen.getByRole("button", { name: "Remove idea" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Keep it" }),
  );
  expect(screen.getByRole("heading", { name: "Memory booth" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Remove idea" }));
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(
    screen.queryByRole("heading", { name: "Memory booth" }),
  ).not.toBeInTheDocument();
});
