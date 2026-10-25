import { z } from "zod";
const text = (max = 200) => z.string().trim().min(1).max(max);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
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
  })
  .superRefine((event, context) => {
    for (const key of ["budgets", "tasks", "vendors", "guestList", "ideas"]) {
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
});
export function uid() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function shiftDate(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function allocateBudget(total, weights) {
  let used = 0;
  return weights.map(([category, percent], i) => {
    const amount =
      i === weights.length - 1
        ? total - used
        : Math.floor((total * percent) / 100);
    used += amount;
    return { category, amount };
  });
}
const templateData = {
  wedding: {
    weights: [
      ["Venue & catering", 40],
      ["Decor & flowers", 15],
      ["Photography", 12],
      ["Outfits & beauty", 10],
      ["Music & entertainment", 8],
      ["Invitations & gifts", 5],
      ["Contingency", 10],
    ],
    tasks: [
      ["Set your priorities together", 120, "Planning"],
      ["Shortlist and visit venues", 100, "Venue"],
      ["Book catering and ask about dietary needs", 75, "Catering"],
      ["Choose your photographer", 60, "Photography"],
      ["Send invitations and collect RSVPs", 45, "Guests"],
      ["Confirm decor, music and the ceremony plan", 30, "Vendors"],
      ["Finalize guest count and seating", 10, "Guests"],
      ["Confirm arrival times with every vendor", 7, "Vendors"],
      ["Prepare a day-of essentials kit", 2, "Planning"],
    ],
    ideas: [
      [
        "A table full of stories",
        "Give each table a name inspired by a place or memory you share. Add a short note so your guests feel part of the story.",
        "Personal touch",
      ],
      [
        "Locally grown, beautifully gathered",
        "Seasonal flowers and reusable vessels create a thoughtful setting. Ask your florist what is local and in season.",
        "Mindful celebration",
      ],
      [
        "A welcome worth remembering",
        "Set up a welcome drink station with clear ingredient labels and an alcohol-free option for everyone.",
        "Guest experience",
      ],
    ],
  },
  birthday: {
    weights: [
      ["Venue & food", 40],
      ["Decor & theme", 15],
      ["Cake & desserts", 12],
      ["Activities", 13],
      ["Invitations & gifts", 10],
      ["Contingency", 10],
    ],
    tasks: [
      ["Choose a theme and guest list", 30, "Planning"],
      ["Reserve a venue or plan the space", 25, "Venue"],
      ["Send invitations", 21, "Guests"],
      ["Book the cake and food", 14, "Catering"],
      ["Plan games and a music playlist", 10, "Activities"],
      ["Check dietary needs and RSVPs", 7, "Guests"],
      ["Prepare decorations and party kits", 3, "Decor"],
      ["Confirm deliveries and setup", 1, "Vendors"],
    ],
    ideas: [
      [
        "The memory wall",
        "Invite guests to bring a favorite photo or write a short memory. Turn the collection into a keepsake after the party.",
        "Personal touch",
      ],
      [
        "A make-your-own moment",
        "Try a cupcake decorating or mocktail station with allergy labels. It doubles as an activity and a treat.",
        "Interactive",
      ],
      [
        "A celebration that feels like you",
        "Build a playlist around favorite years, songs and inside jokes. Leave a few slots for guest requests.",
        "Atmosphere",
      ],
    ],
  },
  community: {
    weights: [
      ["Venue & permits", 25],
      ["Food & refreshments", 25],
      ["Equipment & sound", 15],
      ["Activities & materials", 15],
      ["Outreach & signage", 10],
      ["Contingency", 10],
    ],
    tasks: [
      ["Define the purpose and form a volunteer team", 60, "Planning"],
      ["Check venue access and permit requirements", 45, "Venue"],
      ["Build a safety and accessibility plan", 40, "Safety"],
      ["Confirm food and equipment suppliers", 30, "Vendors"],
      ["Publish invitations and registration details", 21, "Guests"],
      ["Assign volunteer roles and shifts", 14, "Volunteers"],
      ["Confirm an indoor or bad-weather backup", 7, "Safety"],
      ["Brief volunteers and check access routes", 1, "Volunteers"],
    ],
    ideas: [
      [
        "A neighborhood talent corner",
        "Make room for short performances, local makers and community groups. Offer a simple sign-up with clear time slots.",
        "Connection",
      ],
      [
        "Everyone has a place",
        "Provide step-free access, a quiet area, clear signage and seating near activities. Ask attendees about access needs.",
        "Inclusion",
      ],
      [
        "A lighter footprint",
        "Use refill stations and clearly marked waste bins. Share public transport directions and bring-your-own bottle reminders.",
        "Sustainability",
      ],
    ],
  },
};
export function starterPlan(brief) {
  const t = templateData[brief.type];
  return {
    summary: `A thoughtful starting point for ${brief.title}: ${brief.guests} guests in ${brief.location}. Protect a 10% contingency, confirm local quotes, and make the experience welcoming. ${brief.preferences ? `Your preferences: ${brief.preferences}. ` : ""}These are editable planning estimates, not vendor quotes.`,
    budgets: allocateBudget(brief.budget, t.weights),
    tasks: t.tasks.map(([title, daysBefore, category]) => ({
      title,
      daysBefore,
      category,
    })),
    ideas: t.ideas.map(([title, detail, tag]) => ({ title, detail, tag })),
  };
}
export function eventFromPlan(brief, plan = starterPlan(brief)) {
  const earliest = brief.date >= today() ? today() : null;
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
        earliest && shiftDate(brief.date, -t.daysBefore) < earliest
          ? earliest
          : shiftDate(brief.date, -t.daysBefore),
      category: t.category,
      done: false,
    })),
    vendors: [],
    guestList: [],
    ideas: plan.ideas.map((i) => ({ ...i, id: uid(), saved: false })),
    notes: "",
  };
}
export function reviseEvent(event, brief, moveTimeline = true) {
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
export function totals(event) {
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
export function escapeCsv(value) {
  const s = String(value);
  return `"${/^(?:[\s\uFEFF]*[=+\-@]|[\t\r\n])/.test(s) ? "'" : ""}${s.replaceAll('"', '""')}"`;
}
