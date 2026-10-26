/** Storage limits are shared by validation and commands so they cannot drift. */
export const MAX_EVENTS = 30;
export const RECORD_LIMITS = {
  budgets: 100,
  tasks: 300,
  vendors: 100,
  guestList: 1000,
  ideas: 100,
  agenda: 50,
} as const;

export const RECORD_NAMES = {
  budgets: "budget categories",
  tasks: "tasks",
  vendors: "vendors",
  guestList: "guest entries",
  ideas: "ideas",
  agenda: "schedule moments",
} as const;
