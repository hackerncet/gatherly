import test from "node:test";
import assert from "node:assert/strict";
import { readJson, createModelCatalog } from "../server/provider.ts";
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
