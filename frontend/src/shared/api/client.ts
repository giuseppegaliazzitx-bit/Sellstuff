import type { AuthUser, PublicConfig } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "",
  ) {
    super(message);
  }
}

export function getCookie(name: string): string {
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return "";
}

async function defParse(res: Response): Promise<{ code?: string } & Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { code?: string };
  } catch {
    return {};
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCookie("csrf") },
    });
    return res.ok;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    if (!headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", getCookie("csrf"));
    }
    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }
  }
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (res.status === 401 && !retried && path !== "/api/v1/auth/refresh") {
    const body = await res.clone().json().catch(() => ({}) as { code?: string });
    if (body.code === "token_expired" || body.code === "token_stale") {
      const ok = await tryRefresh();
      if (ok) return apiFetch(path, init, true);
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await defParse(res);
  if (!res.ok) {
    throw new ApiError((body.message as string) || `${path} failed`, res.status, (body.code as string) || "");
  }
  return body as T;
}

export function fetchPublicConfig(): Promise<PublicConfig> {
  return apiJson<PublicConfig>("/api/v1/public/config");
}

export function fetchMe(): Promise<AuthUser> {
  return apiJson<AuthUser>("/api/v1/auth/me");
}

export function loginRequest(email: string, password: string, totpCode?: string): Promise<AuthUser> {
  return apiJson<AuthUser>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, totp_code: totpCode || undefined }),
  });
}

export function logoutRequest(): Promise<void> {
  return apiJson("/api/v1/auth/logout", { method: "POST" }).then(() => undefined);
}

export function registerRequest(payload: Record<string, unknown>): Promise<AuthUser> {
  return apiJson<AuthUser>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
