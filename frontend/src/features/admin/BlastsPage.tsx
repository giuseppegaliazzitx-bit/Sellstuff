import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

interface BlastRow {
  id: string;
  subject: string;
  status: string;
  total: number;
  sent: number;
  clicked: number;
  estimated_finish_at: string | null;
}

export function BlastsPage() {
  const [rows, setRows] = useState<BlastRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<BlastRow[]>("/api/v1/admin/blasts"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Blasts</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Sandbox until MAIL_* is set. A mailing address is required to send.
      </p>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}
      <form
        className="mt-4 flex flex-col gap-2 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            const created = await apiJson<{ id: string; total: number; estimated_finish_at: string | null }>(
              "/api/v1/admin/blasts",
              {
                method: "POST",
                body: JSON.stringify({
                  subject: String(fd.get("subject")),
                  body: String(fd.get("body")),
                }),
              },
            );
            setMsg(`Queued ${created.total} recipients. Finishes ${created.estimated_finish_at || "now"}.`);
            await load();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <input name="subject" required placeholder="Subject" className="rounded border px-2 py-1" />
        <textarea name="body" required placeholder="Body" className="rounded border px-2 py-1" rows={4} />
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Create draft
        </button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border bg-white p-3">
            <span>
              {r.subject} · {r.status} · {r.sent}/{r.total}
              {r.estimated_finish_at ? ` · until ${r.estimated_finish_at}` : ""}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="text-gold"
                onClick={async () => {
                  try {
                    await apiJson(`/api/v1/admin/blasts/${r.id}/send`, { method: "POST", body: "{}" });
                    await load();
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : "Send failed");
                  }
                }}
              >
                Send
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiJson(`/api/v1/admin/blasts/${r.id}/pause`, { method: "POST", body: "{}" });
                  await load();
                }}
              >
                Pause
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
