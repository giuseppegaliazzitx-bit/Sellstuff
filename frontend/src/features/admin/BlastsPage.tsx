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
  const [estimate, setEstimate] = useState<string | null>(null);

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
          const segment = {
            tier: String(fd.get("tier") || "") || undefined,
            tag: String(fd.get("tag") || "") || undefined,
            market: String(fd.get("market") || "") || undefined,
            max_price: fd.get("max") ? Math.round(Number(fd.get("max")) * 100) : undefined,
          };
          try {
            const created = await apiJson<{ id: string; total: number; estimated_finish_at: string | null }>(
              "/api/v1/admin/blasts",
              {
                method: "POST",
                body: JSON.stringify({
                  subject: String(fd.get("subject")),
                  body: String(fd.get("body")),
                  deal_id: String(fd.get("deal_id") || "") || null,
                  segment,
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
        <input name="deal_id" placeholder="Deal id (optional)" className="rounded border px-2 py-1" />
        <div className="grid grid-cols-2 gap-2">
          <select name="tier" className="rounded border px-2 py-1">
            <option value="">All tiers</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <input name="tag" placeholder="Tag" className="rounded border px-2 py-1" />
          <input name="market" placeholder="Market" className="rounded border px-2 py-1" />
          <input name="max" type="number" placeholder="Max buy box $" className="rounded border px-2 py-1" />
        </div>
        <button
          type="button"
          className="text-left text-xs text-gold"
          onClick={async () => {
            const est = await apiJson<{ estimated_finish_at: string }>("/api/v1/admin/blasts/estimate?n=1400");
            setEstimate(`1,400 recipients would finish ${est.estimated_finish_at}`);
          }}
        >
          Cap estimate for 1,400
        </button>
        {estimate ? <p className="text-xs text-neutral-500">{estimate}</p> : null}
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Create draft
        </button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border bg-white p-3">
            <span>
              {r.subject} · {r.status} · {r.sent}/{r.total} · {r.clicked} clicks
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
              <button
                type="button"
                className="text-gold"
                onClick={async () => {
                  try {
                    await apiJson(`/api/v1/admin/blasts/${r.id}/resume`, { method: "POST", body: "{}" });
                    await load();
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : "Resume failed");
                  }
                }}
              >
                Resume
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
