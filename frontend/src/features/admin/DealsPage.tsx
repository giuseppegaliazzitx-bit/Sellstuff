import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, getCookie } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import type { DealAdmin } from "../../shared/api/types";

const STATUSES = ["coming_soon", "available", "pending", "under_contract", "assigned", "closed", "dead"];

export function AdminDealsPage() {
  const [rows, setRows] = useState<DealAdmin[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    setRows(await apiJson<DealAdmin[]>("/api/v1/admin/deals"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      const blob = `${r.address1} ${r.city} ${r.state} ${r.postal_code}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, q, status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-row flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            City and state place the listing in its market automatically. Empty markets stay on the desk
            with their agent.
          </p>
        </div>
        <p className="text-sm text-neutral-500">{filtered.length} listings</p>
      </div>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}

      <form
        className="mt-4 grid grid-cols-2 gap-2 rounded-xl border bg-white p-4 text-sm md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await apiJson("/api/v1/admin/deals", {
              method: "POST",
              body: JSON.stringify({
                address1: String(fd.get("address1")),
                city: String(fd.get("city")),
                state: String(fd.get("state") || "TX").toUpperCase(),
                postal_code: String(fd.get("postal") || ""),
                list_price_cents: Math.round(Number(fd.get("price")) * 100),
                arv_cents: Math.round(Number(fd.get("arv")) * 100),
                rehab_high_cents: Math.round(Number(fd.get("rehab") || 0) * 100),
                assignment_fee_cents: Math.round(Number(fd.get("fee") || 0) * 100),
                beds: Math.max(0, Number(fd.get("beds") || 3)),
                baths: Math.max(0, Number(fd.get("baths") || 2)),
                sqft: Number(fd.get("sqft") || 1200),
              }),
            });
            (e.target as HTMLFormElement).reset();
            setMsg("Listing added");
            await load();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Add failed");
          }
        }}
      >
        <p className="col-span-2 font-medium md:col-span-4">New listing</p>
        <input name="address1" required placeholder="Street address" className="rounded border px-2 py-1 md:col-span-2" />
        <input name="city" required placeholder="City" className="rounded border px-2 py-1" />
        <input name="state" required maxLength={2} defaultValue="TX" placeholder="ST" className="rounded border px-2 py-1 uppercase" />
        <input name="postal" placeholder="ZIP" className="rounded border px-2 py-1" />
        <input name="price" type="number" min={0} required placeholder="List price USD" className="rounded border px-2 py-1" />
        <input name="arv" type="number" min={0} required placeholder="ARV USD" className="rounded border px-2 py-1" />
        <input name="rehab" type="number" min={0} placeholder="Rehab USD (desk)" className="rounded border px-2 py-1" />
        <input name="fee" type="number" min={0} placeholder="Fee USD (desk)" className="rounded border px-2 py-1" />
        <input name="beds" type="number" min={0} step={1} defaultValue={3} placeholder="Beds" className="rounded border px-2 py-1" />
        <input name="baths" type="number" min={0} step={0.5} defaultValue={2} placeholder="Baths" className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Add listing
        </button>
      </form>

      <div className="mt-6 flex flex-row flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search address or city"
          className="min-w-[12rem] flex-1 rounded border px-2 py-1 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1 text-sm">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-chip text-xs uppercase tracking-wide text-neutral-600">
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">ARV</th>
              <th className="px-3 py-2">On market</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={`border-t ${r.days_to_close != null && r.days_to_close < 7 ? "bg-red-50" : ""}`}>
                <td className="px-3 py-2">
                  <Link to={`/admin/deals/${r.id}`} className="font-medium text-gold hover:text-gold-hover">
                    {r.address1}
                  </Link>
                </td>
                <td className="px-3 py-2 text-neutral-600">
                  {r.city}, {r.state}
                </td>
                <td className="px-3 py-2">{formatUsd(r.list_price_cents)}</td>
                <td className="px-3 py-2">{formatUsd(r.arv_cents)}</td>
                <td className="px-3 py-2" data-testid="days-on-market">
                  {r.days_on_market != null ? `${r.days_on_market}d` : "—"}
                </td>
                <td className="px-3 py-2">
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
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-row flex-wrap items-center gap-2">
                    <label className="cursor-pointer text-xs text-gold">
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
                      className="text-xs text-red-700"
                      data-testid="delete-deal"
                      onClick={async () => {
                        if (!window.confirm(`Delete ${r.address1}?`)) return;
                        try {
                          await apiJson(`/api/v1/admin/deals/${r.id}`, { method: "DELETE" });
                          await load();
                          setMsg("Listing deleted");
                        } catch (err) {
                          setMsg(err instanceof Error ? err.message : "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-sm text-neutral-500">
                  No listings match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
