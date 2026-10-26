import { eventSchema, type Brief, type Event, type Plan } from "./schemas.ts";
import { uid, shiftDate, today } from "./dates.ts";
import { starterPlan } from "./templates.ts";

export function eventFromPlan(
  brief: Brief,
  plan: Plan = starterPlan(brief),
): Event {
  const earliest = brief.date >= today() ? today() : "0001-01-01";
  return {
    ...brief,
    id: uid(),
    budgets: plan.budgets.map((b) => ({
      id: uid(),
      category: b.category,
      planned: b.amount,
      paid: 0,
    })),
    tasks: plan.tasks.map((t) => ({
      id: uid(),
      title: t.title,
      date:
        Date.parse(`${brief.date}T12:00:00Z`) - t.daysBefore * 86400000 <
        Date.parse(`${earliest}T12:00:00Z`)
          ? earliest
          : shiftDate(brief.date, -t.daysBefore),
      category: t.category,
      done: false,
    })),
    vendors: plan.vendors.map((v) => ({
      id: uid(),
      name: `Your ${v.category.toLowerCase()} team`.slice(0, 100),
      category: v.category,
      contact: "",
      quote: 0,
      status: "shortlisted" as const,
      notes: v.requirements,
      checklist: [false, false, false, false],
    })),
    guestList: [],
    ideas: plan.ideas.map((i) => ({ ...i, id: uid(), saved: false })),
    notes: "",
    agenda: [],
    provenance: {
      source: "template",
      model: null,
      createdAt: new Date().toISOString(),
    },
  };
}
export function reviseEvent(event: Event, brief: Brief, moveTimeline = true) {
  const delta = Math.round(
    (Date.parse(`${brief.date}T12:00:00Z`) -
      Date.parse(`${event.date}T12:00:00Z`)) /
      86400000,
  );
  return eventSchema.parse({
    ...event,
    ...brief,
    tasks: event.tasks.map((task) =>
      moveTimeline && !task.done && delta
        ? { ...task, date: shiftDate(task.date, delta) }
        : task,
    ),
  });
}
export function totals(event: Event) {
  const allocated = event.budgets.reduce((n, b) => n + b.planned, 0);
  const paid = event.budgets.reduce((n, b) => n + b.paid, 0);
  return {
    allocated,
    paid,
    remaining: event.budget - paid,
    unallocated: event.budget - allocated,
    completed: event.tasks.filter((t) => t.done).length,
    totalTasks: event.tasks.length,
    confirmed: event.guestList
      .filter((g) => g.rsvp === "confirmed")
      .reduce((n, g) => n + g.count, 0),
  };
}
export function escapeCsv(value: unknown) {
  const s = String(value);
  return `"${/^(?:[\s\uFEFF]*[=+\-@]|[\t\r\n])/.test(s) ? "'" : ""}${s.replaceAll('"', '""')}"`;
}
