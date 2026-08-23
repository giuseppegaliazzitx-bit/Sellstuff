import type { PublicConfig } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    throw new ApiError(`${path} failed`, res.status);
  }
  return (await res.json()) as T;
}

export function fetchPublicConfig(): Promise<PublicConfig> {
  return getJson<PublicConfig>("/api/v1/public/config");
}
