import type { modelSchema } from "./contracts.ts";
import type { z } from "zod";
import type {
  Brief,
  budgetSchema,
  taskSchema,
  vendorSchema,
  guestSchema,
  ideaSchema,
} from "./schemas.ts";
export type { Brief, Event, Plan, Workspace } from "./schemas.ts";
export type EventType = Brief["type"];
export type Currency = Brief["currency"];
export type Budget = z.infer<typeof budgetSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export type Model = z.infer<typeof modelSchema>;
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
