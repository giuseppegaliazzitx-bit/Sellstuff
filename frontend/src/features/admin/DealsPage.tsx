import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
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
              beds: Number(fd.get("beds") || 3),
              baths: 2,
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
        <input name="price" type="number" required placeholder="List price USD" className="rounded border px-2 py-1" />
        <input name="arv" type="number" required placeholder="ARV USD" className="rounded border px-2 py-1" />
        <input name="rehab" type="number" placeholder="Rehab USD (desk)" className="rounded border px-2 py-1" />
        <input name="fee" type="number" placeholder="Fee USD (desk)" className="rounded border px-2 py-1" />
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
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t ${r.days_to_close != null && r.days_to_close < 7 ? "bg-red-50" : ""}`}>
              <td className="px-2 py-2">{r.address1}</td>
              <td className="px-2 py-2">{formatUsd(r.list_price_cents)}</td>
              <td className="px-2 py-2">{formatUsd(r.arv_cents)}</td>
              <td className="px-2 py-2">{formatUsd(r.rehab_high_cents)}</td>
              <td className="px-2 py-2">{r.days_to_close != null ? `${r.days_to_close} days` : "—"}</td>
              <td className="px-2 py-2">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
