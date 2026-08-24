import { useEffect, useState } from "react";
import { apiJson, getCookie } from "../../shared/api/client";
import type { MarketManager, MarketOut } from "../../shared/api/types";

export function ManagersPage() {
  const [rows, setRows] = useState<MarketManager[]>([]);
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<MarketManager[]>("/api/v1/admin/managers"));
    setMarkets(await apiJson<MarketOut[]>("/api/v1/markets"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold">Market managers</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Profiles shown to buyers on Browse when they pick a market. Assign one or more markets per person.
      </p>
      {msg ? <p className="mt-2 text-sm text-gold">{msg}</p> : null}
      <form
        className="mt-4 flex flex-col gap-2 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const market_ids = fd.getAll("markets").map(String);
          try {
            await apiJson("/api/v1/admin/managers", {
              method: "POST",
              body: JSON.stringify({
                name: String(fd.get("name")),
                phone: String(fd.get("phone") || ""),
                email: String(fd.get("email") || ""),
                license: String(fd.get("license") || ""),
                market_ids,
              }),
            });
            setMsg("Saved");
            (e.target as HTMLFormElement).reset();
            await load();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <input name="name" required placeholder="Full name" className="rounded border px-2 py-1" />
        <input name="phone" placeholder="Phone / text" className="rounded border px-2 py-1" />
        <input name="email" type="email" placeholder="Email" className="rounded border px-2 py-1" />
        <input name="license" placeholder="License (e.g. TX 767801)" className="rounded border px-2 py-1" />
        <fieldset className="flex flex-row flex-wrap gap-3">
          <legend className="text-xs text-neutral-500">Markets</legend>
          {markets.map((m) => (
            <label key={m.id} className="flex flex-row items-center gap-1">
              <input type="checkbox" name="markets" value={m.id} /> {m.name}
            </label>
          ))}
        </fieldset>
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Add profile
        </button>
      </form>
      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-row items-center gap-3 rounded border bg-white p-3 text-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip">
              {r.photo_url ? <img src={r.photo_url} alt="" className="h-full w-full object-cover" /> : r.name[0]}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-neutral-500">
                {r.license || "No license"} · {r.phone || "no phone"} · {r.email || "no email"}
              </p>
              <p className="text-xs text-neutral-400">
                {markets.filter((m) => r.market_ids.includes(m.id)).map((m) => m.name).join(", ") || "No markets"}
              </p>
            </div>
            <label className="text-xs text-gold">
              Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  await fetch(`/api/v1/admin/managers/${r.id}/photo`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "X-CSRF-Token": getCookie("csrf") },
                    body: fd,
                  });
                  await load();
                }}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
