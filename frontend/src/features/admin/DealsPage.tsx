import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, getCookie } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import type { DealAdmin, MarketOut } from "../../shared/api/types";

export function AdminDealsPage() {
  const [rows, setRows] = useState<DealAdmin[]>([]);
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<DealAdmin[]>("/api/v1/admin/deals"));
    setMarkets(await apiJson<MarketOut[]>("/api/v1/markets"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}
      <form
        className="mt-4 grid grid-cols-2 gap-2 rounded border bg-white p-4 text-sm md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const market_id = String(fd.get("market_id"));
          await apiJson("/api/v1/admin/deals", {
            method: "POST",
            body: JSON.stringify({
              market_id,
              address1: String(fd.get("address1")),
              city: String(fd.get("city") || "Dallas"),
              state: "TX",
              list_price_cents: Math.round(Number(fd.get("price")) * 100),
              arv_cents: Math.round(Number(fd.get("arv")) * 100),
              rehab_high_cents: Math.round(Number(fd.get("rehab") || 0) * 100),
              assignment_fee_cents: Math.round(Number(fd.get("fee") || 0) * 100),
              beds: Math.max(0, Number(fd.get("beds") || 3)),
              baths: Math.max(0, Number(fd.get("baths") || 2)),
              sqft: Number(fd.get("sqft") || 1200),
              lat: 32.7767,
              lng: -96.797,
            }),
          });
          await load();
        }}
      >
        <select name="market_id" className="rounded border px-2 py-1" required>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input name="address1" required placeholder="Address" className="rounded border px-2 py-1" />
        <input name="city" placeholder="City" className="rounded border px-2 py-1" />
        <input name="price" type="number" min={0} required placeholder="List price USD" className="rounded border px-2 py-1" />
        <input name="arv" type="number" min={0} required placeholder="ARV USD" className="rounded border px-2 py-1" />
        <input name="rehab" type="number" min={0} placeholder="Rehab USD (desk)" className="rounded border px-2 py-1" />
        <input name="fee" type="number" min={0} placeholder="Fee USD (desk)" className="rounded border px-2 py-1" />
        <input name="beds" type="number" min={0} step={1} defaultValue={3} placeholder="Beds" className="rounded border px-2 py-1" />
        <input name="baths" type="number" min={0} step={0.5} defaultValue={2} placeholder="Baths" className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Add deal
        </button>
      </form>
      <table className="mt-6 min-w-full text-left text-sm">
        <thead>
          <tr className="bg-chip text-xs uppercase">
            <th className="px-2 py-2">Address</th>
            <th className="px-2 py-2">Price</th>
            <th className="px-2 py-2">ARV</th>
            <th className="px-2 py-2">Rehab</th>
            <th className="px-2 py-2">Clock</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t ${r.days_to_close != null && r.days_to_close < 7 ? "bg-red-50" : ""}`}>
              <td className="px-2 py-2">
                <Link to={`/admin/deals/${r.id}`} className="text-gold hover:text-gold-hover">
                  {r.address1}
                </Link>
              </td>
              <td className="px-2 py-2">{formatUsd(r.list_price_cents)}</td>
              <td className="px-2 py-2">{formatUsd(r.arv_cents)}</td>
              <td className="px-2 py-2">{formatUsd(r.rehab_high_cents)}</td>
              <td className="px-2 py-2">{r.days_to_close != null ? `${r.days_to_close} days` : "—"}</td>
              <td className="px-2 py-2">
                <select
                  value={r.status}
                  className="rounded border text-xs"
                  onChange={async (e) => {
                    try {
                      await apiJson(`/api/v1/admin/deals/${r.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: e.target.value }),
                      });
                      await load();
                    } catch (err) {
                      setMsg(err instanceof Error ? err.message : "Status failed");
                    }
                  }}
                >
                  {["coming_soon", "available", "pending", "under_contract", "assigned", "closed", "dead"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </td>
              <td className="px-2 py-2">
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
                      await fetch(`/api/v1/admin/deals/${r.id}/photos`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "X-CSRF-Token": getCookie("csrf") },
                        body: fd,
                      });
                      await load();
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="ml-2 text-xs text-gold"
                  onClick={async () => {
                    await apiJson(`/api/v1/admin/deals/${r.id}/geocode`, { method: "POST", body: "{}" });
                    await load();
                  }}
                >
                  Geocode
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
