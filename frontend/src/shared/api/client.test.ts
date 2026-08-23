import { afterEach, expect, test, vi } from "vitest";
import { apiFetch } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("retries once on token_stale after a successful refresh", async () => {
  let deals = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return new Response("{}", { status: 200 });
      }
      deals += 1;
      if (deals === 1) {
        return new Response(JSON.stringify({ code: "token_stale" }), { status: 401 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }),
  );
  const res = await apiFetch("/api/v1/deals");
  expect(res.status).toBe(200);
  expect(deals).toBe(2);
});

test("redirects are left to the caller when refresh fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return new Response(JSON.stringify({ code: "token_invalid" }), { status: 401 });
      }
      return new Response(JSON.stringify({ code: "token_stale" }), { status: 401 });
    }),
  );
  const res = await apiFetch("/api/v1/deals");
  expect(res.status).toBe(401);
});
