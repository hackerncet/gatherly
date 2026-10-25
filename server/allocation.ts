import { z } from "zod";
import { aiPlanSchema, briefSchema } from "../src/lib/domain.ts";

const reserveCategory = /contingency|reserve|buffer/i;
export const weightedCategoriesSchema = z
  .array(
    z.object({
      category: z.string().trim().min(1).max(80),
      weight: z.number().int().min(1).max(100),
    }),
  )
  .min(1)
  .max(14)
  .refine(
    (rows) =>
      new Set(rows.map((row) => row.category.toLowerCase())).size ===
      rows.length,
    "Budget categories must be distinct.",
  );

// Providers suggest relative priorities. Only application code calculates money.
export const providerPlanSchema = aiPlanSchema.omit({ budgets: true }).extend({
  budgets: weightedCategoriesSchema,
  tasks: aiPlanSchema.shape.tasks.min(8).max(10),
  ideas: aiPlanSchema.shape.ideas.min(3).max(5),
  vendors: aiPlanSchema.shape.vendors.unwrap().min(2).max(4),
});

/** Largest-remainder allocation preserves every currency unit deterministically. */
export function allocatePlanBudget(
  total: number,
  input: z.infer<typeof weightedCategoriesSchema>,
) {
  const budget = briefSchema.shape.budget.parse(total);
  const categories = weightedCategoriesSchema
    .parse(input)
    .filter((row) => !reserveCategory.test(row.category));
  if (!categories.length)
    throw new RangeError("At least one event category is required.");
  const reserve = Math.ceil(budget / 10);
  const available = budget - reserve;
  const weightTotal = categories.reduce((sum, row) => sum + row.weight, 0);
  const rows = categories.map((row, index) => ({
    category: row.category,
    amount: Math.floor((available * row.weight) / weightTotal),
    remainder: (available * row.weight) % weightTotal,
    index,
  }));
  const left = available - rows.reduce((sum, row) => sum + row.amount, 0);
  const ranked = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (let i = 0; i < left; i++) rows[ranked[i].index].amount++;
  return [
    ...rows.map(({ category, amount }) => ({ category, amount })),
    { category: "Contingency", amount: reserve },
  ];
}
