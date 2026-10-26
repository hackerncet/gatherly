import { eventFromPlan } from "../../src/lib/domain.ts";
export const brief = {
  title: "Community planning review",
  type: "community" as const,
  date: "2027-05-15",
  location: "Bengaluru",
  guests: 40,
  budget: 60000,
  currency: "INR" as const,
  preferences: "Step-free, vegan, outdoor rain backup and reusable decor",
};
export const makeEvent = () => eventFromPlan(brief);
export function makeWorkspace() {
  const event = makeEvent();
  return { version: 1 as const, events: [event], activeId: event.id };
}
export const freeModel = {
  id: "openrouter/free",
  name: "Free router",
  free: true,
  contextLength: 0,
  inputPrice: "0",
  outputPrice: "0",
};
export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
