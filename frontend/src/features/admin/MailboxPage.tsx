import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

interface Status {
  configured: boolean;
  sandbox: boolean;
  sent_today: number;
  daily_limit: number;
  dead_letters: number;
  last_error: string;
}

export function MailboxPage() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    apiJson<Status>("/api/v1/mail/status").then(setS).catch(() => undefined);
  }, []);
  if (!s) return <p className="p-8 text-sm">Loading mailbox…</p>;
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold">Mailbox</h1>
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
        {s.last_error ? <p className="text-red-700">{s.last_error}</p> : null}
      </dl>
      <p className="mt-6 text-xs text-neutral-500">
        Leave MAIL_* blank to stay in sandbox. Drop a Gmail app password in `.env` when ready — no code change.
      </p>
    </div>
  );
}
