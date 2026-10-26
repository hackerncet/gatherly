import { z } from "zod";
const text = (max = 200) => z.string().trim().min(1).max(max);
export const agendaItemSchema = z.object({
  id: text(100),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: text(160),
  owner: z.string().trim().max(100),
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      v >= "0001-01-01" &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v,
    "Choose a valid date",
  );
const money = z.number().finite().int().min(0).max(1_000_000_000);
export const briefSchema = z.object({
  title: text(100),
  type: z.enum(["wedding", "birthday", "community"]),
  date: dateSchema,
  location: text(120),
  guests: z.number().int().min(1).max(100000),
  budget: money.min(1),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  preferences: z.string().trim().max(1600),
});
export const budgetSchema = z.object({
  id: text(100),
  category: text(80),
  planned: money,
  paid: money,
});
export const taskSchema = z.object({
  id: text(100),
  title: text(180),
  date: dateSchema,
  category: text(60),
  done: z.boolean(),
});
export const vendorSchema = z.object({
  id: text(100),
  name: text(100),
  category: text(80),
  contact: z.string().trim().max(180),
  quote: money,
  status: z.enum(["shortlisted", "contacted", "booked"]),
  notes: z.string().max(600),
  checklist: z.array(z.boolean()).length(4),
});
export const guestSchema = z.object({
  id: text(100),
  name: text(100),
  group: text(60),
  count: z.number().int().min(1).max(100),
  rsvp: z.enum(["pending", "confirmed", "declined"]),
  dietary: z.string().max(180),
});
export const ideaSchema = z.object({
  id: text(100),
  title: text(160),
  detail: text(600),
  tag: text(50),
  saved: z.boolean(),
});
export const eventSchema = briefSchema
  .extend({
    id: text(100),
    budgets: z.array(budgetSchema).max(100),
    tasks: z.array(taskSchema).max(300),
    vendors: z.array(vendorSchema).max(100),
    guestList: z.array(guestSchema).max(1000),
    ideas: z.array(ideaSchema).max(100),
    notes: z.string().max(10000),
    agenda: z.array(agendaItemSchema).max(50).default([]),
    provenance: z
      .object({
        source: z.enum(["ai", "template"]),
        model: z.string().max(160).nullable(),
        createdAt: z.string().datetime(),
      })
      .optional(),
  })
  .superRefine((event, context) => {
    for (const key of [
      "budgets",
      "tasks",
      "vendors",
      "guestList",
      "ideas",
      "agenda",
    ] as const) {
      const entries = event[key];
      if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
        context.addIssue({
          code: "custom",
          message: "Duplicate item identifiers are not allowed.",
          path: [key],
        });
      }
    }
  });
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    events: z.array(eventSchema).min(1).max(30),
    activeId: text(100),
  })
  .superRefine((workspace, context) => {
    if (
      new Set(workspace.events.map((event) => event.id)).size !==
      workspace.events.length
    )
      context.addIssue({
        code: "custom",
        message: "Duplicate event identifiers are not allowed.",
        path: ["events"],
      });
  });
export const aiPlanSchema = z.object({
  summary: text(1500),
  budgets: z
    .array(z.object({ category: text(80), amount: money }))
    .min(1)
    .max(15),
  tasks: z
    .array(
      z.object({
        title: text(180),
        daysBefore: z.number().int().min(0).max(730),
        category: text(60),
      }),
    )
    .min(1)
    .max(25),
  ideas: z
    .array(z.object({ title: text(160), detail: text(600), tag: text(50) }))
    .min(1)
    .max(12),
  vendors: z
    .array(z.object({ category: text(80), requirements: text(600) }))
    .max(10)
    .default([]),
});
export type Brief = z.infer<typeof briefSchema>;
export type Plan = z.infer<typeof aiPlanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
