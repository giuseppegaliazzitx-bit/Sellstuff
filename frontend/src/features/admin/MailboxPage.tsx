import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

interface Status {
  configured: boolean;
  sandbox: boolean;
  sent_today: number;
  daily_limit: number;
  dead_letters: number;
  last_error: string;
  last_imap_uid?: number;
  last_sync_at?: string | null;
  brand_name?: string;
  mailing_address?: string;
}

interface Unmatched {
  id: string;
  from_addr: string;
  subject: string;
  body: string;
  created_at: string;
}

export function MailboxPage() {
  const [s, setS] = useState<Status | null>(null);
  const [unmatched, setUnmatched] = useState<Unmatched[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setS(await apiJson<Status>("/api/v1/mail/status"));
    setUnmatched(await apiJson<Unmatched[]>("/api/v1/admin/mail/unmatched"));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  if (!s) return <p className="p-8 text-sm">Loading mailbox…</p>;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Mailbox</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Brand {s.brand_name}. Change PUBLIC_BRAND_* in .env — this page is a read-only preview.
      </p>
      {msg ? <p className="mt-2 text-sm text-gold">{msg}</p> : null}
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between rounded border bg-white px-3 py-2">
          <dt>Mode</dt>
          <dd>{s.sandbox ? "sandbox (.eml)" : "SMTP connected"}</dd>
        </div>
        <div className="flex justify-between rounded border bg-white px-3 py-2">
          <dt>Sent today</dt>
          <dd>
            {s.sent_today} / {s.daily_limit}
          </dd>
        </div>
        <div className="flex justify-between rounded border bg-white px-3 py-2">
          <dt>Dead letters</dt>
          <dd>{s.dead_letters}</dd>
        </div>
        <div className="flex justify-between rounded border bg-white px-3 py-2">
          <dt>Last IMAP UID</dt>
          <dd>{s.last_imap_uid ?? 0}</dd>
        </div>
        {s.last_error ? <p className="text-red-700">{s.last_error}</p> : null}
      </dl>
      <h2 className="mt-8 font-medium">Unmatched inbound</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {unmatched.map((row) => (
          <li key={row.id} className="rounded border bg-white p-3">
            <p className="font-medium">{row.subject || "(no subject)"}</p>
            <p className="text-xs text-neutral-500">{row.from_addr}</p>
            <p className="mt-1 text-neutral-700">{row.body}</p>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const userId = String(new FormData(e.currentTarget).get("user_id") || "");
                try {
                  await apiJson(`/api/v1/admin/mail/${row.id}/link`, {
                    method: "POST",
                    body: JSON.stringify({ user_id: userId }),
                  });
                  setMsg("Linked");
                  await load();
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Link failed");
                }
              }}
            >
              <input name="user_id" required placeholder="Buyer user id" className="flex-1 rounded border px-2 py-1" />
              <button type="submit" className="text-gold">
                Link
              </button>
            </form>
          </li>
        ))}
        {unmatched.length === 0 ? <p className="text-neutral-500">No unmatched mail.</p> : null}
      </ul>
      <p className="mt-6 text-xs text-neutral-500">
        Leave MAIL_* blank to stay in sandbox. Drop a Gmail app password in `.env` when ready — no code change.
      </p>
    </div>
  );
}
