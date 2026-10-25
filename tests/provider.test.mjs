import test from "node:test";
import assert from "node:assert/strict";
import {
  readJson,
  createModelCatalog,
  completionParameters,
  retryAfterSeconds,
} from "../server/provider.ts";

test("provider retry delays accept seconds or HTTP dates and bound invalid values", () => {
  const now = Date.parse("2026-10-26T00:00:00Z");
  assert.equal(retryAfterSeconds("120", now), 120);
  assert.equal(retryAfterSeconds("Mon, 26 Oct 2026 00:01:30 GMT", now), 90);
  assert.equal(retryAfterSeconds("999999", now), 86400);
  for (const value of [
    null,
    "private provider diagnostic",
    "-20",
    "0",
    "Sun, 25 Oct 2026 00:00:00 GMT",
  ])
    assert.equal(retryAfterSeconds(value, now), 60);
});
test("stream decoding preserves split Unicode characters", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ name: "తెలుగు" }));
  let position = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (position >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(position, position + 1));
      position++;
    },
  });
  assert.deepEqual(await readJson(new Response(stream), 1000), {
    name: "తెలుగు",
  });
});
test("declared oversized and empty responses fail before JSON parsing", async () => {
  await assert.rejects(() =>
    readJson(
      new Response("{}", { headers: { "content-length": "10000" } }),
      100,
    ),
  );
  await assert.rejects(() => readJson(new Response(null), 100));
});
test("invalid model catalog response uses a bounded fallback", async () => {
  for (const response of [
    new Response("{}"),
    new Response('{"data":[]}'),
    new Response("{}", { status: 503 }),
  ]) {
    const models = createModelCatalog(async () => response);
    assert.equal((await models()).source, "fallback");
  }
});

test("models with no declared JSON capability retain compatible prompt-only requests", () => {
  assert.deepEqual(completionParameters({ supportsJson: false }), {});
  assert.deepEqual(completionParameters({}), {});
});

test("catalog reasoning controls preserve mandatory and unknown provider requirements", async () => {
  const data = [
    { id: "optional", reasoning: { mandatory: false } },
    {
      id: "mandatory",
      reasoning: { mandatory: true, supported_efforts: ["low", "high"] },
    },
    {
      id: "fixed",
      reasoning: { mandatory: true, supported_efforts: ["high"] },
    },
    { id: "unknown" },
    {
      id: "not-supported",
      reasoning: { mandatory: false },
      supported_parameters: [],
    },
  ].map((m) => ({ name: m.id, supported_parameters: ["reasoning"], ...m }));
  const catalog = await createModelCatalog(
    async () => new Response(JSON.stringify({ data })),
  )();
  const parameters = (id) =>
    completionParameters(catalog.models.find((m) => m.id === id));
  assert.deepEqual(parameters("optional"), { reasoning: { enabled: false } });
  assert.deepEqual(parameters("mandatory"), { reasoning: { effort: "low" } });
  for (const id of ["fixed", "unknown", "not-supported"])
    assert.deepEqual(parameters(id), {});
  assert.deepEqual(parameters("openrouter/free").reasoning, { effort: "low" });
});
