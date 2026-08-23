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
  const initial = new URLSearchParams(window.location.search).get("tab");
  const [tab, setTab] = useState<"profile" | "box" | "sessions" | "security">(
    initial === "2fa" || initial === "security" ? "security" : "profile",
  );
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
        {(["profile", "box", "sessions", "security"] as const).map((t) => (
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
      {tab === "security" ? <SecurityPanel /> : null}
    </div>
  );
}

function SecurityPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);

  return (
    <div className="mt-6 max-w-md space-y-6 text-sm">
      {msg ? <p className="text-gold">{msg}</p> : null}
      <form
        className="flex flex-col gap-2 rounded border bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await apiJson("/api/v1/auth/change-password", {
              method: "POST",
              body: JSON.stringify({
                current_password: String(fd.get("current")),
                new_password: String(fd.get("next")),
              }),
            });
            setMsg("Password changed. Other sessions were revoked.");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <p className="font-medium">Change password</p>
        <input name="current" type="password" required placeholder="Current" className="rounded border px-2 py-1" />
        <input name="next" type="password" required placeholder="New" className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-header px-3 py-1 text-white">
          Update password
        </button>
      </form>
      <form
        className="flex flex-col gap-2 rounded border bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const password = String(fd.get("password"));
          try {
            if (!secret) {
              const began = await apiJson<{ secret: string; otpauth_url: string }>("/api/v1/auth/totp/begin", {
                method: "POST",
                body: JSON.stringify({ password }),
              });
              setSecret(began.secret);
              setOtpauth(began.otpauth_url);
              setMsg("Scan the secret in your authenticator, then enter a code.");
              return;
            }
            const done = await apiJson<{ recovery_codes: string[] }>("/api/v1/auth/totp/confirm", {
              method: "POST",
              body: JSON.stringify({ password, secret, code: String(fd.get("code")) }),
            });
            setCodes(done.recovery_codes);
            setMsg("Two-factor enrolled. Store these recovery codes — they are shown once.");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <p className="font-medium">Authenticator (TOTP)</p>
        {otpauth ? <p className="break-all text-xs text-neutral-500">{otpauth}</p> : null}
        {secret ? <p className="font-mono text-xs">{secret}</p> : null}
        <input name="password" type="password" required placeholder="Account password" className="rounded border px-2 py-1" />
        {secret ? (
          <input name="code" required placeholder="6-digit code" className="rounded border px-2 py-1" />
        ) : null}
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          {secret ? "Confirm enrollment" : "Start enrollment"}
        </button>
      </form>
      {codes ? (
        <ul className="rounded border bg-white p-4 font-mono text-xs">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
