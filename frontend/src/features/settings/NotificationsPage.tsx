import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

interface Note {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export function NotificationsPage() {
  const [rows, setRows] = useState<Note[]>([]);
  async function load() {
    setRows(await apiJson<Note[]>("/api/v1/me/notifications"));
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <button
        type="button"
        className="mt-2 text-sm text-gold"
        onClick={async () => {
          await apiJson("/api/v1/me/notifications/read-all", { method: "POST", body: "{}" });
          await load();
        }}
      >
        Mark all read
      </button>
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((n) => (
          <li
            key={n.id}
            className={`rounded border p-3 ${n.read ? "bg-white" : "bg-chip"}`}
            onClick={async () => {
              await apiJson(`/api/v1/me/notifications/${n.id}/read`, { method: "POST", body: "{}" });
              await load();
            }}
          >
            <p className="font-medium">{n.type}</p>
            <p className="text-xs text-neutral-500">{new Date(n.created_at).toLocaleString()}</p>
          </li>
        ))}
        {rows.length === 0 ? <p className="text-neutral-500">You’re caught up.</p> : null}
      </ul>
    </div>
  );
}
