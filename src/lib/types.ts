export type EventType = "wedding" | "birthday" | "community";
export type Currency = "INR" | "USD" | "EUR" | "GBP";
export interface Brief {
  title: string;
  type: EventType;
  date: string;
  location: string;
  guests: number;
  budget: number;
  currency: Currency;
  preferences: string;
}
export interface Budget {
  id: string;
  category: string;
  planned: number;
  paid: number;
}
export interface Task {
  id: string;
  title: string;
  date: string;
  category: string;
  done: boolean;
}
export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  quote: number;
  status: "shortlisted" | "contacted" | "booked";
  notes: string;
  checklist: boolean[];
}
export interface Guest {
  id: string;
  name: string;
  group: string;
  count: number;
  rsvp: "pending" | "confirmed" | "declined";
  dietary: string;
}
export interface Idea {
  id: string;
  title: string;
  detail: string;
  tag: string;
  saved: boolean;
}
export interface Event extends Brief {
  id: string;
  budgets: Budget[];
  tasks: Task[];
  vendors: Vendor[];
  guestList: Guest[];
  ideas: Idea[];
  notes: string;
}
export interface Workspace {
  version: 1;
  events: Event[];
  activeId: string;
}
export interface Plan {
  summary: string;
  budgets: { category: string; amount: number }[];
  tasks: { title: string; daysBefore: number; category: string }[];
  ideas: { title: string; detail: string; tag: string }[];
}
export interface Model {
  id: string;
  name: string;
  free: boolean;
  contextLength: number;
  inputPrice: string;
  outputPrice: string;
}
export type Page =
  | "overview"
  | "budget"
  | "timeline"
  | "vendors"
  | "guests"
  | "inspiration"
  | "studio"
  | "settings";
