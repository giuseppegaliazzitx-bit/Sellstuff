import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import { SessionsPage } from "./SessionsPage";

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  max_price_cents: number | null;
  markets: string[];
  asset_types: string[];
  email_alerts_enabled: boolean;
}

export function SettingsPage() {
  const [tab, setTab] = useState<"profile" | "box" | "sessions">("profile");
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Profile>("/api/v1/auth/me/profile").then(setP).catch(() => undefined);
  }, []);

  if (!p) return <p className="p-8 text-sm">Loading settings…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-4 flex gap-2 text-sm">
        {(["profile", "box", "sessions"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 ${tab === t ? "bg-header text-white" : "bg-chip"}`}
          >
            {t === "box" ? "Buy box" : t}
          </button>
        ))}
      </div>
      {msg ? <p className="mt-3 text-sm text-gold">{msg}</p> : null}
      {tab === "profile" ? (
        <form
          className="mt-6 flex max-w-md flex-col gap-3 rounded border bg-white p-4 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = await apiJson<Profile>("/api/v1/auth/me/profile", {
              method: "PATCH",
              body: JSON.stringify({
                name: String(fd.get("name")),
                phone: String(fd.get("phone")),
                company: String(fd.get("company")),
                email_alerts_enabled: Boolean(fd.get("alerts")),
              }),
            });
            setP(updated);
            setMsg("Saved");
          }}
        >
          <p className="text-neutral-500">{p.email}</p>
          <input name="name" defaultValue={p.name} className="rounded border px-2 py-1" />
          <input name="phone" defaultValue={p.phone} placeholder="Phone" className="rounded border px-2 py-1" />
          <input name="company" defaultValue={p.company} placeholder="Company" className="rounded border px-2 py-1" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="alerts" defaultChecked={p.email_alerts_enabled} /> Email alerts
          </label>
          <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
            Save
          </button>
        </form>
      ) : null}
      {tab === "box" ? (
        <form
          className="mt-6 flex max-w-md flex-col gap-3 rounded border bg-white p-4 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const dollars = Number(fd.get("max") || 0);
            const updated = await apiJson<Profile>("/api/v1/auth/me/buy-box", {
              method: "PUT",
              body: JSON.stringify({
                max_price_cents: dollars ? Math.round(dollars * 100) : null,
                markets: String(fd.get("markets") || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                asset_types: String(fd.get("types") || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
            });
            setP(updated);
            setMsg("Buy box updated");
          }}
        >
          <input
            name="max"
            type="number"
            defaultValue={p.max_price_cents ? p.max_price_cents / 100 : ""}
            placeholder="Max purchase USD"
            className="rounded border px-2 py-1"
          />
          <input
            name="markets"
            defaultValue={p.markets.join(", ")}
            placeholder="Markets (Dallas, Houston)"
            className="rounded border px-2 py-1"
          />
          <input
            name="types"
            defaultValue={p.asset_types.join(", ")}
            placeholder="Asset types (SFR, 2-4)"
            className="rounded border px-2 py-1"
          />
          <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
            Save buy box
          </button>
        </form>
      ) : null}
      {tab === "sessions" ? <SessionsPage /> : null}
    </div>
  );
}
