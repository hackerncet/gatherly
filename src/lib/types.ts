import type { z } from "zod";
import type {
  budgetSchema,
  taskSchema,
  vendorSchema,
  guestSchema,
  ideaSchema,
} from "./schemas.ts";
export type { Brief, Event, Plan, Workspace } from "./schemas.ts";
export type EventType = "wedding" | "birthday" | "community";
export type Currency = "INR" | "USD" | "EUR" | "GBP";
export type Budget = z.infer<typeof budgetSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export interface Model {
  id: string;
  name: string;
  free: boolean;
  contextLength: number;
  inputPrice: string;
  outputPrice: string;
  supportsJson?: boolean;
  supportsSchema?: boolean;
  reasoningMode?: "off" | "low";
}
export type Page =
  | "guide"
  | "overview"
  | "budget"
  | "timeline"
  | "vendors"
  | "guests"
  | "inspiration"
  | "studio"
  | "settings";
