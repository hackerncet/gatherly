import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  Store,
  Users,
  Lightbulb,
} from "lucide-react";
import type { Page, Event } from "./types";
export const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "guests", label: "Guest list", icon: Users },
  { id: "inspiration", label: "Inspiration", icon: Lightbulb },
  { id: "guide", label: "Event guide", icon: CalendarDays },
] as const;

export const pageTitles: Record<Page, string> = {
  overview: "Overview",
  budget: "Budget",
  timeline: "Timeline",
  vendors: "Vendors",
  guests: "Guest list",
  inspiration: "Inspiration",
  guide: "Event guide",
  studio: "AI planning studio",
  settings: "Settings & data",
};
export function pageFromHash(hash = location.hash): Page {
  const value = hash.slice(1);
  return (
    Object.keys(pageTitles).find((page): page is Page => page === value) ??
    "overview"
  );
}
export function searchEvent(event: Event, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length < 2) return [];
  const records: { title: string; page: Page; kind: string; id: string }[] = [
    ...event.tasks.map((task) => ({
      title: task.title,
      page: "timeline" as const,
      kind: "Task",
      id: task.id,
    })),
    ...event.vendors.map((vendor) => ({
      title: vendor.name,
      page: "vendors" as const,
      kind: "Vendor",
      id: vendor.id,
    })),
    ...event.ideas.map((idea) => ({
      title: idea.title,
      page: "inspiration" as const,
      kind: "Idea",
      id: idea.id,
    })),
  ];
  return records
    .filter((record) => record.title.toLocaleLowerCase().includes(normalized))
    .slice(0, 7);
}
