import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import type { MarketOut, PlaceOut } from "../../shared/api/types";
import { marketLabel } from "../../shared/api/types";

export function MarketsPage() {
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [hits, setHits] = useState<PlaceOut[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMarkets(await apiJson<MarketOut[]>("/api/v1/admin/markets"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      apiJson<PlaceOut[]>(`/api/v1/admin/places?q=${encodeURIComponent(q)}`)
        .then(setHits)
        .catch(() => setHits([]));
    }, 150);
    return () => window.clearTimeout(t);
  }, [q]);

  const live = new Set(markets.map((m) => `${(m.city || m.name).toLowerCase()}|${m.state}`));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Markets</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Buyers only see a market when it has a live listing. Empty markets stay here with their agent so
        the next listing in that city does not need a new assignment.
      </p>
      {msg ? <p className="mt-2 text-sm text-gold">{msg}</p> : null}
      <label className="mt-4 flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Add a market
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Dallas, Houston, Miami…"
          className="rounded border px-2 py-2 text-sm font-normal normal-case text-neutral-900"
        />
      </label>
      <ul className="mt-2 max-h-64 overflow-y-auto rounded border bg-white">
        {hits.map((p) => {
          const taken = live.has(`${p.city.toLowerCase()}|${p.state}`);
          return (
            <li key={p.label} className="flex flex-row items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0">
              <span>
                {p.label}
                <span className="ml-2 text-xs text-neutral-400">{p.timezone}</span>
              </span>
              <button
                type="button"
                disabled={taken}
                className="text-gold disabled:text-neutral-400"
                onClick={async () => {
                  try {
                    await apiJson("/api/v1/admin/markets", {
                      method: "POST",
                      body: JSON.stringify({ city: p.city, state: p.state }),
                    });
                    setMsg(`Added ${p.label}`);
                    await load();
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : "Could not add");
                  }
                }}
              >
                {taken ? "Live" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Live markets</h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {markets.map((m) => (
          <li key={m.id} className="flex flex-row items-center justify-between gap-2 rounded border bg-white px-3 py-2">
            <span>
              {marketLabel(m)}
              <span className="ml-2 text-xs text-neutral-400">
                {m.listing_count || 0} live · {m.timezone}
              </span>
            </span>
            <button
              type="button"
              className="text-xs text-red-700"
              onClick={async () => {
                if (!window.confirm(`Remove ${marketLabel(m)} from the desk list? Listings and the agent stay.`)) return;
                try {
                  await apiJson(`/api/v1/admin/markets/${m.id}`, { method: "DELETE" });
                  setMsg(`Removed ${marketLabel(m)}`);
                  await load();
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Remove failed");
                }
              }}
            >
              Remove
            </button>
          </li>
        ))}
        {markets.length === 0 ? <li className="text-neutral-500">None yet.</li> : null}
      </ul>
    </div>
  );
}
