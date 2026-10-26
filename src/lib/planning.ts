import { shiftDate, totals } from "./domain.ts";
import type { Event } from "./types";

export function planningInsights(event: Event, now: string) {
  const values = totals(event);
  const insights: {
    title: string;
    detail: string;
    page: "budget" | "timeline" | "vendors" | "guests";
  }[] = [];
  if (values.unallocated < 0)
    insights.push({
      title: "Planned spending exceeds the budget",
      detail:
        "Reduce an allocation or revise the total after reviewing priorities.",
      page: "budget",
    });
  if (values.remaining < 0)
    insights.push({
      title: "Recorded payments exceed the budget",
      detail:
        "Reconcile actual payments and agree on the revised spending limit.",
      page: "budget",
    });
  const overdue = event.tasks.filter((t) => !t.done && t.date < now).length;
  if (overdue)
    insights.push({
      title: `${overdue} unfinished task${overdue === 1 ? " is" : "s are"} overdue`,
      detail: "Review deadlines and decide what needs attention today.",
      page: "timeline",
    });
  const unchecked = event.vendors.filter(
    (v) => v.status === "booked" && !v.checklist.every(Boolean),
  ).length;
  if (unchecked)
    insights.push({
      title: "Some booked vendors have unfinished checks",
      detail:
        "Confirm written quotes, availability, cancellation terms and the booking directly.",
      page: "vendors",
    });
  if (values.confirmed < event.guests)
    insights.push({
      title: "Guest confirmations are still incomplete",
      detail: `${values.confirmed} confirmed against ${event.guests} expected. Follow up before final catering and seating decisions.`,
      page: "guests",
    });
  return insights;
}

function icsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}
/** Fold content lines at 75 UTF-8 octets, as required by iCalendar. */
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = "";
  let length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) {
      result += "\r\n ";
      length = 1;
    }
    result += character;
    length += size;
  }
  return result;
}
export function calendarFile(event: Event, createdAt = new Date()) {
  const stamp = createdAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const entries = [
    {
      id: JSON.stringify([event.id, "event"]),
      title: event.title,
      date: event.date,
      location: event.location,
    },
    ...event.tasks
      .filter((t) => !t.done)
      .map((t) => ({
        ...t,
        id: JSON.stringify([event.id, "task", t.id]),
        location: "",
      })),
  ];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gatherly//Event Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const entry of entries)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsText(entry.id)}@gatherly.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${entry.date.replaceAll("-", "")}`,
      // A date-only event without DTEND lasts one day (RFC 5545 §3.6.1).
      ...(entry.date === "9999-12-31"
        ? []
        : [`DTEND;VALUE=DATE:${shiftDate(entry.date, 1).replaceAll("-", "")}`]),
      `SUMMARY:${icsText(entry.title)}`,
      `LOCATION:${icsText(entry.location)}`,
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Export plain user text, without creating HTML, links or Markdown instructions. */
function markdownText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([\\`*_{}[\]()!#+|])/g, "\\$1")
    .replace(/\r\n|\r|\n/g, " ");
}
export function eventBrief(event: Event) {
  const value = totals(event);
  return [
    `# ${markdownText(event.title)}`,
    `${event.type} · ${event.date} · ${markdownText(event.location)}`,
    `Expected guests: ${event.guests}. Confirmed: ${value.confirmed}.`,
    `Budget: ${event.currency} ${event.budget}. Planned: ${value.allocated}. Paid: ${value.paid}.`,
    "\n## Event-day schedule",
    ...[...event.agenda]
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(
        (a) =>
          `${a.time} — ${markdownText(a.title)}${a.owner ? ` (${markdownText(a.owner)})` : ""}`,
      ),
    "\n## Outstanding tasks",
    ...event.tasks
      .filter((t) => !t.done)
      .map((t) => `- ${t.date}: ${markdownText(t.title)}`),
    "\n## Vendor checks",
    ...event.vendors.map(
      (v) =>
        `- ${markdownText(v.category)}: ${markdownText(v.name)} (${v.status}); ${v.checklist.filter(Boolean).length}/4 checks recorded`,
    ),
    "\n## Preferences",
    markdownText(event.preferences),
    "\nEstimates and manually recorded statuses require organizer verification. No reservations or messages are sent.",
  ].join("\n");
}
