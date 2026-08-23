import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import { useAuth } from "../../shared/auth";

interface ThreadRow {
  id: string;
  subject: string;
  deal_id: string | null;
}
interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ChatPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  async function load() {
    const rows = await apiJson<ThreadRow[]>("/api/v1/threads");
    setThreads(rows);
    if (!active && rows[0]) setActive(rows[0].id);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  useEffect(() => {
    const deal = params.get("deal");
    if (deal) {
      apiJson<ThreadRow>("/api/v1/threads", {
        method: "POST",
        body: JSON.stringify({ subject: "About this house", deal_id: deal }),
      }).then((t) => {
        setActive(t.id);
        load();
      });
    }
  }, [params]);

  useEffect(() => {
    if (!active) return;
    const tick = () =>
      apiJson<Msg[]>(`/api/v1/threads/${active}/messages`).then(setMessages).catch(() => undefined);
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="mx-auto flex max-w-4xl gap-4 px-4 py-8">
      <ul className="w-48 text-sm">
        {threads.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setActive(t.id)}
              className={`w-full px-2 py-1 text-left ${active === t.id ? "bg-chip" : ""}`}
            >
              {t.subject}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex-1">
        <div className="min-h-64 rounded border bg-white p-3 text-sm">
          {messages.map((m) => (
            <p key={m.id} className={m.sender_id === user?.id ? "text-right" : ""}>
              {m.body}
            </p>
          ))}
        </div>
        {active ? (
          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = String(new FormData(e.currentTarget).get("body") || "");
              (e.currentTarget.elements.namedItem("body") as HTMLInputElement).value = "";
              await apiJson(`/api/v1/threads/${active}/messages`, {
                method: "POST",
                body: JSON.stringify({ body }),
              });
              setMessages(await apiJson<Msg[]>(`/api/v1/threads/${active}/messages`));
            }}
          >
            <input name="body" className="flex-1 rounded border px-2 py-1 text-sm" />
            <button type="submit" className="rounded bg-gold px-3 py-1 text-sm text-white">
              Send
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
