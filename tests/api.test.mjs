import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createApp } from "../server/app.ts";
import { starterPlan } from "../src/lib/domain.ts";
const brief = {
  title: "Community garden day",
  type: "community",
  date: "2027-04-10",
  location: "Bengaluru",
  guests: 80,
  budget: 80000,
  currency: "INR",
  preferences: "Accessible, low waste",
};
const input = {
  brief,
  model: "test/model",
  prompt: "Seasonal food",
  consent: true,
};
const env = {
  NODE_ENV: "test",
  OPENROUTER_API_KEY: "test-server-only-secret",
  AI_ACCESS_CODE: "test-access-code-1234",
};
const catalog = {
  data: [
    {
      id: "test/model",
      name: "Test Text",
      architecture: { output_modalities: ["text"] },
      pricing: { prompt: "0", completion: "0" },
    },
    {
      id: "test/image",
      name: "Image",
      architecture: { output_modalities: ["image"] },
      pricing: { prompt: "1", completion: "1" },
    },
  ],
};
async function run(options, fn) {
  const server = createApp({ rateLimits: false, ...options }).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base, server);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
const post = (base, body = input, headers = {}) =>
  fetch(`${base}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const providerPlan = () => ({
  ...starterPlan(brief),
  tasks: starterPlan(brief).tasks.slice(0, 8),
  ideas: starterPlan(brief).ideas.slice(0, 3),
  budgets: [
    { category: "Venue & activities", weight: 55 },
    { category: "Food & refreshments", weight: 35 },
    { category: "Supplies", weight: 10 },
  ],
});
const mockFetch =
  (reply = providerPlan()) =>
  async (url) =>
    new Response(
      JSON.stringify(
        url.endsWith("/models")
          ? catalog
          : { choices: [{ message: { content: JSON.stringify(reply) } }] },
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

test("a client disconnected while waiting for the catalog cannot start billable generation", async () => {
  let releaseCatalog, catalogStarted;
  const started = new Promise((resolve) => {
    catalogStarted = resolve;
  });
  const waiting = new Promise((resolve) => {
    releaseCatalog = resolve;
  });
  let generations = 0;
  await run(
    {
      env,
      fetchImpl: async (url) => {
        if (url.endsWith("/models")) {
          catalogStarted();
          await waiting;
        } else generations++;
        return mockFetch()(url);
      },
    },
    async (base, server) => {
      const disconnected = new Promise((resolve) => {
        server.once("request", (_request, response) =>
          response.once("close", resolve),
        );
      });
      const request = httpRequest(`${base}/api/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-access-code": env.AI_ACCESS_CODE,
        },
      });
      request.on("error", () => {});
      request.end(JSON.stringify(input));
      await started;
      const closed = once(request, "close").catch(() => {});
      request.destroy();
      await closed;
      await disconnected;
      releaseCatalog();
      await fetch(`${base}/api/models`);
      assert.equal(generations, 0);
    },
  );
});

test("native structured-output routes receive the same bounded provider contract enforced on return", () => {
  let captured;
  return run(
    {
      env,
      fetchImpl: async (url, options) => {
        if (url.endsWith("/models"))
          return new Response(
            JSON.stringify({
              data: [
                {
                  ...catalog.data[0],
                  supported_parameters: [
                    "structured_outputs",
                    "response_format",
                  ],
                },
              ],
            }),
          );
        captured = JSON.parse(options.body);
        return mockFetch()(url);
      },
    },
    async (base) => {
      const response = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(response.status, 200);
      const format = captured.response_format;
      assert.equal(format.type, "json_schema");
      assert.equal(format.json_schema.strict, true);
      assert.equal(format.json_schema.schema.additionalProperties, false);
      assert.ok(format.json_schema.schema.required.includes("vendors"));
      const category = format.json_schema.schema.properties.budgets.items;
      assert.equal(category.additionalProperties, false);
      assert.equal(category.properties.weight.maximum, 100);
      assert.equal(category.properties.amount, undefined);
      assert.equal(captured.max_tokens, 2200);
    },
  );
});

for (const [metadata, control] of [
  [{ mandatory: false }, { enabled: false }],
  [{ mandatory: true, supported_efforts: ["low", "high"] }, { effort: "low" }],
])
  test(`planner respects advertised reasoning controls ${JSON.stringify(control)}`, () => {
    let captured;
    return run(
      {
        env,
        fetchImpl: async (url, options) => {
          if (url.endsWith("/models"))
            return new Response(
              JSON.stringify({
                data: [
                  {
                    ...catalog.data[0],
                    supported_parameters: ["reasoning"],
                    reasoning: metadata,
                  },
                ],
              }),
            );
          captured = JSON.parse(options.body);
          return mockFetch()(url);
        },
      },
      async (base) => {
        const response = await post(base, input, {
          "x-ai-access-code": env.AI_ACCESS_CODE,
        });
        assert.equal(response.status, 200);
        assert.deepEqual(captured.reasoning, control);
        assert.equal(captured.max_tokens, 2200);
      },
    );
  });

test("provider capacity errors expose safe retry guidance without provider text", async () => {
  for (const [header, expected] of [
    ["120", "120"],
    ["private retry metadata", "60"],
  ])
    await run(
      {
        env,
        fetchImpl: async (url) =>
          url.endsWith("/models")
            ? mockFetch()(url)
            : new Response("private provider body", {
                status: 429,
                headers: { "Retry-After": header },
              }),
      },
      async (base) => {
        const response = await post(base, input, {
          "x-ai-access-code": env.AI_ACCESS_CODE,
        });
        const data = await response.json();
        assert.equal(response.status, 429);
        assert.equal(response.headers.get("retry-after"), expected);
        assert.equal(data.code, "provider_rate_limit");
        assert.match(data.error, /wait|another model/);
        assert.doesNotMatch(
          JSON.stringify(data),
          /private provider|private retry/,
        );
      },
    );
});
test("health exposes readiness without secrets or event records", () =>
  run({ env }, async (base) => {
    const response = await fetch(`${base}/api/health`);
    const data = await response.json();
    assert.equal(data.status, "ok");
    assert.equal(data.aiEnabled, true);
    assert.equal(JSON.stringify(data).includes(env.OPENROUTER_API_KEY), false);
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
  }));
test("dummy keys use template mode without an upstream request", () =>
  run(
    {
      env: { OPENROUTER_API_KEY: "sk-or-v1-DUMMY_REPLACE_ME" },
      fetchImpl: () => {
        throw Error("must not call upstream");
      },
    },
    async (base) => {
      const res = await post(base);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.source, "template");
      assert.equal(data.model, null);
    },
  ));
test("real API key without access code stays disabled", () =>
  run({ env: { OPENROUTER_API_KEY: "real-key" } }, async (base) => {
    assert.equal((await (await post(base)).json()).source, "template");
  }));
test("rejects cross-origin requests before generation", () =>
  run({ env: {} }, async (base) => {
    assert.equal(
      (await post(base, input, { origin: "https://hostile.example" })).status,
      403,
    );
    assert.equal(
      (await post(base, input, { "sec-fetch-site": "cross-site" })).status,
      403,
    );
  }));
test("rejects malformed and oversized requests", () =>
  run({ env: {} }, async (base) => {
    assert.equal(
      (await post(base, { ...input, brief: { ...brief, budget: -1 } })).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        })
      ).status,
      400,
    );
    assert.equal(
      (await post(base, { ...input, prompt: "x".repeat(25000) })).status,
      413,
    );
  }));
test("live generation requires a matching access code", () =>
  run({ env, fetchImpl: mockFetch() }, async (base) => {
    assert.equal((await post(base)).status, 401);
    assert.equal(
      (await post(base, input, { "x-ai-access-code": "incorrect" })).status,
      401,
    );
    const res = await post(base, input, {
      "x-ai-access-code": env.AI_ACCESS_CODE,
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).source, "ai");
  }));
test("catalog filters image-only models and caches successful responses", () => {
  let calls = 0;
  return run(
    {
      env,
      fetchImpl: async (...args) => {
        calls++;
        return mockFetch()(...args);
      },
    },
    async (base) => {
      const a = await (await fetch(`${base}/api/models`)).json();
      assert.equal(
        a.models.some((m) => m.id === "test/image"),
        false,
      );
      assert.equal(
        a.models.some((m) => m.id === "test/model"),
        true,
      );
      await fetch(`${base}/api/models`);
      assert.equal(calls, 1);
    },
  );
});
test("catalog failure returns a clearly identified fallback", () =>
  run(
    {
      env,
      fetchImpl: async () => {
        throw Error("offline");
      },
    },
    async (base) => {
      const data = await (await fetch(`${base}/api/models`)).json();
      assert.equal(data.source, "fallback");
      assert.equal(data.models[0].id, "openrouter/free");
    },
  ));
test("rejects unavailable model IDs", () =>
  run({ env, fetchImpl: mockFetch() }, async (base) => {
    assert.equal(
      (
        await post(
          base,
          { ...input, model: "not/a-model" },
          { "x-ai-access-code": env.AI_ACCESS_CODE },
        )
      ).status,
      400,
    );
  }));
test("only the brief and prompt reach the provider; secrets are server-only", () => {
  let captured;
  return run(
    {
      env,
      fetchImpl: async (url, options) => {
        if (!url.endsWith("/models")) captured = options;
        return mockFetch()(url);
      },
    },
    async (base) => {
      const response = await post(
        base,
        {
          ...input,
          guestList: [{ name: "PRIVATE GUEST" }],
          vendorContacts: "PRIVATE PHONE",
        },
        { "x-ai-access-code": env.AI_ACCESS_CODE },
      );
      assert.equal(response.status, 200);
      assert.ok(
        captured.headers.Authorization.includes(env.OPENROUTER_API_KEY),
      );
      assert.equal(captured.body.includes("PRIVATE GUEST"), false);
      assert.equal(captured.body.includes("PRIVATE PHONE"), false);
      assert.equal(captured.body.includes(env.AI_ACCESS_CODE), false);
      assert.equal(
        JSON.stringify(await response.json()).includes(env.OPENROUTER_API_KEY),
        false,
      );
    },
  );
});
test("rejects provider currency amounts instead of trusting them as allocation weights", () => {
  const plan = starterPlan(brief);
  plan.budgets[0].amount = brief.budget + 1;
  return run({ env, fetchImpl: mockFetch(plan) }, async (base) => {
    const res = await post(base, input, {
      "x-ai-access-code": env.AI_ACCESS_CODE,
    });
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /not changed/);
  });
});
test("malformed model output is rejected safely", () =>
  run({ env, fetchImpl: mockFetch({ bad: "plan" }) }, async (base) => {
    assert.equal(
      (await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }))
        .status,
      502,
    );
  }));
test("provider payment failures are redacted and actionable", () =>
  run(
    {
      env,
      fetchImpl: async (url) =>
        url.endsWith("/models")
          ? mockFetch()(url)
          : new Response("secret provider diagnostic", { status: 402 }),
    },
    async (base) => {
      const res = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(res.status, 502);
      const body = await res.json();
      assert.match(body.error, /credits/);
      assert.doesNotMatch(body.error, /secret provider/);
    },
  ));
test("provider cancellation or timeout returns a recoverable error", () =>
  run(
    {
      env,
      fetchImpl: async (url) => {
        if (url.endsWith("/models")) return mockFetch()(url);
        throw new DOMException("aborted", "AbortError");
      },
    },
    async (base) => {
      assert.equal(
        (await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }))
          .status,
        504,
      );
    },
  ));
test("hourly per-IP generation limit is enforced", () =>
  run({ env: {}, rateLimits: true }, async (base) => {
    for (let i = 0; i < 8; i++) assert.equal((await post(base)).status, 200);
    assert.equal((await post(base)).status, 429);
  }));
test("unknown API paths return JSON instead of the SPA", () =>
  run({ env: {} }, async (base) => {
    const res = await fetch(`${base}/api/does-not-exist`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, "Endpoint not found.");
  }));
test("production asset paths cannot read server sources or dotfiles", () =>
  run({ env: {} }, async (base) => {
    assert.equal((await fetch(`${base}/server/app.ts`)).status, 404);
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.equal((await fetch(`${base}/`)).status, 200);
  }));

test("short access codes leave live AI disabled", () =>
  run({ env: { ...env, AI_ACCESS_CODE: "short" } }, async (base) => {
    const data = await (await fetch(`${base}/api/health`)).json();
    assert.equal(data.aiEnabled, false);
  }));

test("concurrent catalog requests share one upstream fetch", () => {
  let calls = 0;
  return run(
    {
      env,
      fetchImpl: async (...args) => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return mockFetch()(...args);
      },
    },
    async (base) => {
      const results = await Promise.all([
        fetch(`${base}/api/models`),
        fetch(`${base}/api/models`),
        fetch(`${base}/api/models`),
      ]);
      assert.ok(results.every((r) => r.status === 200));
      assert.equal(calls, 1);
    },
  );
});
test("three generation slots protect the provider from additional concurrent work", () => {
  const releases = [];
  return run(
    {
      env,
      fetchImpl: async (url) => {
        if (url.endsWith("/models")) return mockFetch()(url);
        await new Promise((resolve) => releases.push(resolve));
        return mockFetch()(url);
      },
    },
    async (base) => {
      const pending = [1, 2, 3].map(() =>
        post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }),
      );
      try {
        for (let i = 0; i < 40 && releases.length < 3; i++)
          await new Promise((resolve) => setTimeout(resolve, 5));
        assert.equal(releases.length, 3);
        assert.equal(
          (await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }))
            .status,
          429,
        );
      } finally {
        releases.forEach((resolve) => resolve());
        await Promise.all(pending);
      }
    },
  );
});
test("daily provider attempt cap cannot be exceeded", () =>
  run({ env, fetchImpl: mockFetch() }, async (base) => {
    for (let i = 0; i < 100; i++)
      assert.equal(
        (await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }))
          .status,
        200,
      );
    assert.equal(
      (await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE }))
        .status,
      429,
    );
  }));
test("fenced JSON is accepted while executable-looking text stays inert data", () => {
  const plan = providerPlan();
  plan.ideas[0].title = "<script>alert(1)</script>";
  return run(
    {
      env,
      fetchImpl: async (url) =>
        url.endsWith("/models")
          ? mockFetch()(url)
          : new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: "```json\n" + JSON.stringify(plan) + "\n```",
                    },
                  },
                ],
              }),
            ),
    },
    async (base) => {
      const res = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(res.status, 200);
      assert.equal(
        (await res.json()).plan.ideas[0].title,
        "<script>alert(1)</script>",
      );
    },
  );
});
test("fingerprinted assets use immutable caching and entry HTML revalidates", () =>
  run({ env: {} }, async (base) => {
    const html = await fetch(`${base}/`);
    assert.equal(html.headers.get("cache-control"), "no-cache");
    const body = await html.text();
    const path = body.match(/src="([^\"]+\.js)"/)[1];
    const asset = await fetch(base + path);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("cache-control"), /immutable/);
  }));

test("health pinpoints missing configuration without disclosing credential values", () =>
  run({ env: { OPENROUTER_API_KEY: "configured-key" } }, async (base) => {
    const data = await (await fetch(`${base}/api/health`)).json();
    assert.deepEqual(data.ai, {
      enabled: false,
      keyConfigured: true,
      accessConfigured: false,
    });
    assert.ok(!JSON.stringify(data).includes("configured-key"));
  }));
test("planning endpoint rejects unsupported content types", () =>
  run({ env: {} }, async (base) => {
    const response = await fetch(`${base}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 415);
  }));
test("maximum valid brief produces a contract-valid starter response", () =>
  run({ env: {} }, async (base) => {
    const { aiPlanSchema } = await import("../src/lib/domain.ts");
    const response = await post(base, {
      ...input,
      brief: { ...brief, preferences: "p".repeat(1600) },
    });
    assert.equal(response.status, 200);
    assert.ok(aiPlanSchema.safeParse((await response.json()).plan).success);
  }));
for (const [label, budgets, code] of [
  ["zero weights", [{ category: "Food", weight: 0 }], "invalid_plan"],
  [
    "only reserve categories",
    [{ category: "Contingency", weight: 10 }],
    "invalid_budget",
  ],
])
  test(`AI plans with ${label} fail validation`, () =>
    run(
      { env, fetchImpl: mockFetch({ ...providerPlan(), budgets }) },
      async (base) => {
        const response = await post(base, input, {
          "x-ai-access-code": env.AI_ACCESS_CODE,
        });
        assert.equal(response.status, 502);
        assert.equal((await response.json()).code, code);
      },
    ));

test("actual provider model identity and vendor requirements are returned", () =>
  run(
    {
      env,
      fetchImpl: async (url) =>
        url.endsWith("/models")
          ? mockFetch()(url)
          : new Response(
              JSON.stringify({
                model: "provider/actual-model",
                choices: [
                  { message: { content: JSON.stringify(providerPlan()) } },
                ],
              }),
            ),
    },
    async (base) => {
      const data = await (
        await post(base, input, { "x-ai-access-code": env.AI_ACCESS_CODE })
      ).json();
      assert.equal(data.source, "ai");
      assert.equal(data.model, "provider/actual-model");
      assert.ok(data.plan.vendors.every((v) => v.requirements.length > 0));
    },
  ));
test("oversized streamed provider output is rejected without leaking its contents", () =>
  run(
    {
      env,
      fetchImpl: async (url) =>
        url.endsWith("/models")
          ? mockFetch()(url)
          : new Response("SECRET-UPSTREAM-DETAILS".repeat(8000)),
    },
    async (base) => {
      const response = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes("SECRET-UPSTREAM"));
    },
  ));
test("an oversized model catalog is bounded and falls back", () =>
  run(
    { env, fetchImpl: async () => new Response("x".repeat(3_000_001)) },
    async (base) => {
      const data = await (await fetch(`${base}/api/models`)).json();
      assert.equal(data.source, "fallback");
    },
  ));
test("unknown catalog prices are not displayed as zero cost", () =>
  run(
    {
      env,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [{ id: "unknown/model", name: "Unknown pricing" }],
          }),
        ),
    },
    async (base) => {
      const data = await (await fetch(`${base}/api/models`)).json();
      const model = data.models.find((m) => m.id === "unknown/model");
      assert.equal(model.free, false);
      assert.equal(model.inputPrice, "unknown");
    },
  ));

test("live provider submission requires explicit server-validated consent", () =>
  run(
    {
      env,
      fetchImpl: () => {
        throw new Error("No data should leave the server");
      },
    },
    async (base) => {
      const response = await post(
        base,
        { ...input, consent: false },
        { "x-ai-access-code": env.AI_ACCESS_CODE },
      );
      assert.equal(response.status, 403);
      assert.match((await response.json()).error, /Agree to share/);
    },
  ));

test("provider authentication failure is actionable without exposing upstream details", () =>
  run(
    {
      env,
      fetchImpl: async (url) =>
        url.endsWith("/models")
          ? mockFetch()(url)
          : new Response("private upstream credential details", {
              status: 401,
            }),
    },
    async (base) => {
      const response = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(response.status, 503);
      const data = await response.json();
      assert.match(data.error, /server credentials/);
      assert.ok(!data.error.includes("private upstream"));
    },
  ));

test("JSON-capable model requests require a compatible provider without increasing the token cap", () => {
  let captured;
  return run(
    {
      env,
      fetchImpl: async (url, options) => {
        if (url.endsWith("/models"))
          return new Response(
            JSON.stringify({
              data: [
                {
                  ...catalog.data[0],
                  supported_parameters: ["response_format"],
                },
              ],
            }),
          );
        captured = JSON.parse(options.body);
        return mockFetch()(url);
      },
    },
    async (base) => {
      const response = await post(base, input, {
        "x-ai-access-code": env.AI_ACCESS_CODE,
      });
      assert.equal(response.status, 200);
      assert.deepEqual(captured.response_format, { type: "json_object" });
      assert.deepEqual(captured.provider, { require_parameters: true });
      assert.equal(captured.max_tokens, 2200);
    },
  );
});

for (const [code, choice] of [
  ["output_limit", { finish_reason: "length", message: { content: null } }],
  ["empty_output", { finish_reason: "stop", message: { content: "" } }],
  [
    "invalid_json",
    {
      finish_reason: "stop",
      message: { content: "PRIVATE MALFORMED PROVIDER TEXT" },
    },
  ],
])
  test(`provider ${code} is diagnosed without disclosing upstream text`, () =>
    run(
      {
        env,
        fetchImpl: async (url) =>
          url.endsWith("/models")
            ? mockFetch()(url)
            : new Response(JSON.stringify({ choices: [choice] })),
      },
      async (base) => {
        const response = await post(base, input, {
          "x-ai-access-code": env.AI_ACCESS_CODE,
        });
        const data = await response.json();
        assert.equal(response.status, 502);
        assert.equal(data.code, code);
        assert.match(data.error, /not changed/);
        assert.doesNotMatch(
          JSON.stringify(data),
          /PRIVATE|test-server-only-secret/,
        );
      },
    ));

test("provider weights become exact whole currency allocations with a disclosed reserve", () =>
  run(
    {
      env,
      fetchImpl: mockFetch({
        ...providerPlan(),
        budgets: [
          { category: "Food", weight: 1 },
          { category: "Venue", weight: 1 },
          { category: "Activities", weight: 1 },
        ],
      }),
    },
    async (base) => {
      const response = await post(
        base,
        { ...input, brief: { ...brief, budget: 60002 } },
        { "x-ai-access-code": env.AI_ACCESS_CODE },
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data.plan.budgets, [
        { category: "Food", amount: 18001 },
        { category: "Venue", amount: 18000 },
        { category: "Activities", amount: 18000 },
        { category: "Contingency", amount: 6001 },
      ]);
      assert.match(data.notice, /10% contingency/);
      assert.equal(data.source, "ai");
    },
  ));

test("catalog-listed model aliases route as JSON data and unlisted aliases stay blocked", () => {
  const alias = "~openai/gpt-luna-latest";
  let completion;
  return run(
    {
      env,
      fetchImpl: async (url, options) => {
        if (url.endsWith("/models"))
          return new Response(
            JSON.stringify({ data: [{ ...catalog.data[0], id: alias }] }),
          );
        completion = { url, model: JSON.parse(options.body).model };
        return mockFetch()(url);
      },
    },
    async (base) => {
      const headers = { "x-ai-access-code": env.AI_ACCESS_CODE };
      const response = await post(base, { ...input, model: alias }, headers);
      assert.equal(response.status, 200);
      assert.deepEqual(completion, {
        url: "https://openrouter.ai/api/v1/chat/completions",
        model: alias,
      });
      assert.equal(
        (await post(base, { ...input, model: "~unlisted/model" }, headers))
          .status,
        400,
      );
    },
  );
});

test("variable router prices are unavailable estimates rather than negative dollar rates", () =>
  run(
    {
      env,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                ...catalog.data[0],
                pricing: { prompt: "-1", completion: "-1" },
              },
            ],
          }),
        ),
    },
    async (base) => {
      const data = await (await fetch(`${base}/api/models`)).json();
      const model = data.models.find((m) => m.id === "test/model");
      assert.equal(model.inputPrice, "unknown");
      assert.equal(model.outputPrice, "unknown");
      assert.equal(model.free, false);
    },
  ));
