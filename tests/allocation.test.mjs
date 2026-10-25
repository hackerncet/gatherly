import test from "node:test";
import assert from "node:assert/strict";
import {
  allocatePlanBudget,
  providerPlanSchema,
} from "../server/allocation.ts";
import { starterPlan } from "../src/lib/domain.ts";

const categories = (weights) =>
  weights.map((weight, i) => ({ category: `Category ${i + 1}`, weight }));

test("weighted allocation preserves exact totals, integer money and the reserve across edge budgets", () => {
  for (const total of [1, 2, 9, 10, 11, 99, 100, 101, 60123, 1_000_000_000])
    for (const weights of [
      [1],
      [1, 1, 1],
      [1, 99],
      [6, 7, 13, 17],
      Array(14).fill(100),
    ]) {
      const input = categories(weights);
      const result = allocatePlanBudget(total, input);
      assert.equal(
        result.reduce((sum, row) => sum + row.amount, 0),
        total,
      );
      assert.ok(
        result.every(
          (row) => Number.isSafeInteger(row.amount) && row.amount >= 0,
        ),
      );
      assert.deepEqual(result.at(-1), {
        category: "Contingency",
        amount: Math.ceil(total / 10),
      });
      assert.deepEqual(allocatePlanBudget(total, input), result);
      assert.deepEqual(input, categories(weights));
    }
});

test("rounding ties preserve stable category order and distribute every remaining unit", () => {
  assert.deepEqual(allocatePlanBudget(103, categories([1, 1, 1])), [
    { category: "Category 1", amount: 31 },
    { category: "Category 2", amount: 31 },
    { category: "Category 3", amount: 30 },
    { category: "Contingency", amount: 11 },
  ]);
});

test("nonuniform priorities receive proportional amounts before the fixed reserve", () => {
  assert.deepEqual(
    allocatePlanBudget(101, categories([1, 2, 4])).map((row) => row.amount),
    [13, 26, 51, 11],
  );
});

test("provider reserve categories cannot override or duplicate the application reserve", () => {
  assert.deepEqual(
    allocatePlanBudget(100, [
      { category: "Food", weight: 3 },
      { category: "Reserve", weight: 99 },
    ]),
    [
      { category: "Food", amount: 90 },
      { category: "Contingency", amount: 10 },
    ],
  );
  assert.throws(() =>
    allocatePlanBudget(100, [{ category: "Contingency", weight: 10 }]),
  );
});

test("allocation rejects invalid money, weights and ambiguous categories", () => {
  for (const total of [0, -1, 1.5, Infinity, NaN, 1_000_000_001])
    assert.throws(() => allocatePlanBudget(total, categories([1, 2])));
  for (const input of [
    [],
    categories([0]),
    categories([-1]),
    categories([1.5]),
    categories([101]),
    categories(Array(15).fill(1)),
    [
      { category: "Food", weight: 1 },
      { category: " food ", weight: 2 },
    ],
  ])
    assert.throws(() => allocatePlanBudget(100, input));
});

test("the provider contract accepts relative priorities and rejects invented currency allocations", () => {
  const plan = starterPlan({
    title: "Synthetic test",
    type: "community",
    date: "2027-03-20",
    location: "Bengaluru",
    guests: 40,
    budget: 60000,
    currency: "INR",
    preferences: "",
  });
  assert.equal(providerPlanSchema.safeParse(plan).success, false);
  assert.equal(
    providerPlanSchema.safeParse({ ...plan, budgets: categories([3, 4, 5]) })
      .success,
    true,
  );
});
