import { StrictMode, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlanner } from "../../src/lib/usePlanner";
import { useModelCatalog } from "../../src/lib/useModelCatalog";
import { useServiceStatus } from "../../src/lib/useServiceStatus";
import { apiJson, healthSchema } from "../../src/lib/api.ts";
import { starterPlan } from "../../src/lib/domain.ts";
import { makeEvent, brief, json, freeModel } from "./fixtures";

test("catalog replacement reconciles submitted model ID, selection and capabilities atomically", async () => {
  const paid = {
    ...freeModel,
    id: "provider/reviewed",
    name: "Reviewed route",
    free: false,
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(json({ source: "live", models: [paid] }))
      .mockRejectedValueOnce(new Error("offline")),
  );
  const { result } = renderHook(useModelCatalog);
  await waitFor(() => expect(result.current.source).toBe("live"));
  expect(result.current.model).toBe(paid.id);
  expect(result.current.selected.id).toBe(paid.id);
  act(() => result.current.select("not-listed"));
  expect(result.current.model).toBe(paid.id);
  act(() => result.current.select(paid.id));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.source).toBe("cached"));
  expect(result.current.selected.id).toBe(paid.id);
});

test("an aborted previous catalog response cannot replace a newer refresh", async () => {
  let finish: (response: Response) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(json({ source: "live", models: [freeModel] })),
  );
  const { result } = renderHook(useModelCatalog);
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.source).toBe("live"));
  await act(async () =>
    finish(json({ source: "live", models: [{ ...freeModel, id: "stale" }] })),
  );
  expect(result.current.model).toBe(freeModel.id);
});

test("StrictMode preserves the navigation prompt and starter creation needs no credentials", async () => {
  sessionStorage.setItem("gatherly.prompt", "Reusable decorations");
  const notify = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>{children}</StrictMode>
  );
  const { result } = renderHook(() => usePlanner(makeEvent(), false, notify), {
    wrapper,
  });
  expect(result.current.prompt).toBe("Reusable decorations");
  expect(sessionStorage.getItem("gatherly.prompt")).toBeNull();
  expect(result.current.createEvent()).toBeNull();
  await act(async () => result.current.generate(freeModel.id));
  expect(result.current.preview?.source).toBe("template");
  const created = result.current.createEvent();
  expect(created?.preferences).toContain("Reusable decorations");
});

test("generation requires consent and credentials before any provider request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const event = makeEvent();
  const { result } = renderHook(() => usePlanner(event, true, vi.fn()));
  await act(async () => result.current.generate(freeModel.id));
  expect(result.current.error).toMatch(/agree/);
  act(() => result.current.setConsent(true));
  await act(async () => result.current.generate(freeModel.id));
  expect(result.current.error).toMatch(/access code/);
  expect(fetcher).not.toHaveBeenCalled();
});

test("cancellation releases the UI immediately and late provider success is ignored", async () => {
  let finish: (response: Response) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const event = makeEvent();
  const { result } = renderHook(() => usePlanner(event, true, vi.fn()));
  act(() => {
    result.current.setConsent(true);
    result.current.setCode("synthetic-test-code");
  });
  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = result.current.generate(freeModel.id);
  });
  expect(result.current.loading).toBe(true);
  expect(result.current.createEvent()).toBeNull();
  act(() => result.current.cancel());
  expect(result.current.loading).toBe(false);
  await act(async () => {
    finish(
      json({ source: "ai", model: "provider/model", plan: starterPlan(brief) }),
    );
    await pending;
  });
  expect(result.current.preview).toBeNull();
  expect(result.current.error).toMatch(/stopped/);
});

test("preview keeps the original brief even if event details change before acceptance", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      json({
        source: "ai",
        model: "provider/model",
        plan: starterPlan(brief),
      }),
    ),
  );
  const event = makeEvent();
  const { result, rerender } = renderHook(
    ({ current }) => usePlanner(current, true, vi.fn()),
    { initialProps: { current: event } },
  );
  act(() => {
    result.current.setConsent(true);
    result.current.setCode("synthetic-test-code");
  });
  await act(async () => result.current.generate(freeModel.id));
  rerender({
    current: {
      ...event,
      currency: "USD",
      budget: 123,
      title: "Changed while reviewing",
    },
  });
  expect(result.current.createEvent()).toMatchObject({
    currency: "INR",
    budget: 60000,
    provenance: { model: "provider/model" },
  });
});

test("service readiness distinguishes incomplete setup, retry and unavailable service", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        json({
          status: "ok",
          aiEnabled: false,
          ai: { enabled: false, keyConfigured: true, accessConfigured: false },
          version: "1.2.0",
          storage: "browser-local",
        }),
      )
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(
        json({
          status: "ok",
          aiEnabled: true,
          version: "1.2.0",
          storage: "browser-local",
        }),
      ),
  );
  const { result } = renderHook(useServiceStatus);
  await waitFor(() =>
    expect(result.current.message).toMatch(/private AI_ACCESS_CODE/),
  );
  act(() => result.current.retry());
  await waitFor(() =>
    expect(result.current.message).toMatch(/could not be reached/),
  );
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.enabled).toBe(true));
});

test("non-JSON proxy responses produce recoverable client errors rather than parser internals", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html>temporarily unavailable</html>", { status: 502 }),
      ),
  );
  await expect(apiJson("/api/health", healthSchema)).rejects.toThrow(
    /unreadable response/,
  );
});
