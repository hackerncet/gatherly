import { eventFromPlan, shiftDate, today, workspaceSchema } from "./domain.mjs";
import type { Brief, Event, Workspace } from "./types";
export const STORAGE_KEY = "gatherly.workspace.v1";
function demoWorkspace(): Workspace {
  const base: Brief = {
    title: "Aanya & Arjun",
    type: "wedding",
    date: shiftDate(today(), 90),
    location: "Bengaluru, India",
    guests: 120,
    budget: 600000,
    currency: "INR",
    preferences:
      "An intimate garden wedding, seasonal flowers, vegetarian food and meaningful little details.",
  };
  const wedding = eventFromPlan(base) as Event;
  wedding.tasks[0].done = true;
  wedding.tasks[1].done = true;
  wedding.tasks[2].done = true;
  wedding.budgets[0].paid = 75000;
  wedding.budgets[1].paid = 20000;
  wedding.budgets[2].paid = 15000;
  wedding.vendors = [
    {
      id: "sample-venue",
      name: "Your garden venue",
      category: "Venue & catering",
      contact: "Add your contact",
      quote: 240000,
      status: "contacted",
      notes: "Sample entry — replace with your shortlisted venue.",
      checklist: [true, true, false, false],
    },
    {
      id: "sample-photo",
      name: "Your photography team",
      category: "Photography",
      contact: "Add your contact",
      quote: 72000,
      status: "shortlisted",
      notes: "Sample entry — collect a real quote and portfolio.",
      checklist: [false, false, false, false],
    },
  ];
  wedding.guestList = [
    {
      id: "sample-guest-1",
      name: "Sample family",
      group: "Family",
      count: 4,
      rsvp: "confirmed",
      dietary: "Vegetarian",
    },
    {
      id: "sample-guest-2",
      name: "Sample friends",
      group: "Friends",
      count: 6,
      rsvp: "pending",
      dietary: "",
    },
  ];
  const birthday = eventFromPlan({
    ...base,
    title: "A little birthday magic",
    type: "birthday",
    guests: 25,
    budget: 30000,
    date: shiftDate(today(), 28),
    preferences: "A cozy, creative celebration with friends.",
  }) as Event;
  const community = eventFromPlan({
    ...base,
    title: "The neighborhood gathering",
    type: "community",
    guests: 80,
    budget: 80000,
    date: shiftDate(today(), 45),
    preferences:
      "An inclusive afternoon with local food, music and activities for all ages.",
  }) as Event;
  return {
    version: 1,
    events: [wedding, birthday, community],
    activeId: wedding.id,
  };
}
export function loadWorkspace(): {
  workspace: Workspace;
  warning: string;
  recovery?: string;
} {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: demoWorkspace(), warning: "" };
    const value = workspaceSchema.parse(JSON.parse(raw)) as Workspace;
    if (!value.events.some((e) => e.id === value.activeId))
      value.activeId = value.events[0].id;
    return { workspace: value, warning: "" };
  } catch {
    return {
      workspace: demoWorkspace(),
      recovery: raw || undefined,
      warning:
        "Your saved workspace could not be read. It has not been overwritten. Export a backup before choosing to replace it.",
    };
  }
}
export function saveWorkspace(workspace: Workspace) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(workspaceSchema.parse(workspace)),
  );
}
export function parseBackup(raw: string): Workspace {
  if (raw.length > 25_000_000)
    throw new Error("Backup must be smaller than 25 MB.");
  const value = workspaceSchema.parse(JSON.parse(raw)) as Workspace;
  if (!value.events.some((e) => e.id === value.activeId))
    value.activeId = value.events[0].id;
  if (new Set(value.events.map((e) => e.id)).size !== value.events.length)
    throw new Error("Backup contains duplicate event IDs.");
  return value;
}
export function downloadFile(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
export const dateLabel = (value: string, short = false) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: short ? "short" : "long",
    ...(!short ? { year: "numeric" } : {}),
  }).format(new Date(`${value}T12:00:00`));
export function daysUntil(date: string) {
  return Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today()}T12:00:00Z`)) /
      86400000,
  );
}
