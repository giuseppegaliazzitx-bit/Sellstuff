import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import { useAuth } from "../../shared/auth";

interface ThreadRow {
  id: string;
  subject: string;
  buyer_name?: string;
  buyer_email?: string;
}
interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ChatPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" && !user.preview_as_client;
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const rows = await apiJson<ThreadRow[]>("/api/v1/threads");
        setThreads(rows);
        if (rows[0]) setActive(rows[0].id);
        return;
      }
      const desk = await apiJson<{ id: string }>("/api/v1/me/desk-thread", { method: "POST", body: "{}" });
      setActive(desk.id);
    })().catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    if (!active) return;
    const tick = () =>
      apiJson<Msg[]>(`/api/v1/threads/${active}/messages`).then(setMessages).catch(() => undefined);
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 md:flex-row">
      {isAdmin ? (
        <ul className="flex max-h-80 flex-col overflow-y-auto md:w-56">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActive(t.id)}
                className={`w-full px-2 py-2 text-left text-sm ${active === t.id ? "bg-chip" : ""}`}
              >
                <span className="block font-medium">{t.buyer_name || t.subject}</span>
                <span className="block text-xs text-neutral-500">{t.buyer_email}</span>
              </button>
            </li>
          ))}
          {threads.length === 0 ? <li className="px-2 text-sm text-neutral-500">No questions yet.</li> : null}
        </ul>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <h1 className="text-xl font-semibold">Ask us</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {isAdmin
            ? "Reply to buyer questions here. Market agents are reached by phone or email on Browse."
            : "Ask the desk a question. To reach the agent for a market, use the phone or email on Browse."}
        </p>
        <div className="mt-4 flex min-h-64 flex-1 flex-col gap-2 overflow-y-auto rounded border bg-white p-3 text-sm">
          {messages.map((m) => (
            <p key={m.id} className={m.sender_id === user?.id ? "text-right" : "text-left"}>
              {m.body}
            </p>
          ))}
          {messages.length === 0 ? <p className="text-neutral-400">No messages yet.</p> : null}
        </div>
        {active ? (
          <form
            className="mt-2 flex flex-row gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = String(new FormData(e.currentTarget).get("body") || "");
              if (!body.trim()) return;
              (e.currentTarget.elements.namedItem("body") as HTMLInputElement).value = "";
              await apiJson(`/api/v1/threads/${active}/messages`, {
                method: "POST",
                body: JSON.stringify({ body }),
              });
              setMessages(await apiJson<Msg[]>(`/api/v1/threads/${active}/messages`));
            }}
          >
            <input
              name="body"
              placeholder="Type a question…"
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded bg-gold px-3 py-1 text-sm text-white">
              Send
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
