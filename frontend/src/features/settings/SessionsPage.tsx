import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import type { SessionRow } from "../../shared/api/types";

export function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);

  async function load() {
    setRows(await apiJson<SessionRow[]>("/api/v1/auth/sessions"));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function revoke(id: string) {
    await apiJson(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Sessions</h1>
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded border bg-white p-4 text-sm">
            <div>
              <p className="font-medium">
                {row.device_label || "Device"} {row.current ? "(this device)" : ""}
              </p>
              <p className="text-neutral-500">
                {row.ip} · {new Date(row.issued_at).toLocaleString()}
              </p>
            </div>
            {!row.current ? (
              <button type="button" className="text-red-700" onClick={() => revoke(row.id)}>
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
