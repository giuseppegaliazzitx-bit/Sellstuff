import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import type { BuyerRow } from "../../shared/api/types";

export function BuyersPage() {
  const [rows, setRows] = useState<BuyerRow[]>([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  async function load(status: string) {
    const q = status ? `?status=${status}` : "";
    const data = await apiJson<BuyerRow[]>(`/api/v1/admin/buyers${q}`);
    setRows(data);
  }

  useEffect(() => {
    load(filter).catch((err: Error) => setError(err.message));
  }, [filter]);

  async function act(id: string, action: "approve" | "reject" | "suspend") {
    await apiJson(`/api/v1/admin/buyers/${id}/${action}`, { method: "POST", body: "{}" });
    await load(filter);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Buyers</h1>
      <form
        className="mt-4 rounded border bg-white p-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const csv = String(new FormData(e.currentTarget).get("csv") || "");
          const preview = await apiJson<{ valid: unknown[]; errors: unknown[] }>(
            "/api/v1/admin/users/import",
            { method: "POST", body: JSON.stringify({ csv }) },
          );
          await apiJson("/api/v1/admin/users/import/commit", {
            method: "POST",
            body: JSON.stringify({ rows: preview.valid }),
          });
          setError(
            `Imported ${preview.valid.length}. ${preview.errors.length} row(s) skipped.`,
          );
        }}
      >
        <p className="mb-1 text-xs text-neutral-500">CSV: email,name,phone,tier</p>
        <textarea name="csv" rows={3} className="w-full rounded border px-2 py-1 font-mono text-xs" />
        <button type="submit" className="mt-2 rounded bg-gold px-3 py-1 text-white">
          Import
        </button>
        <a href="/api/v1/admin/users/export" className="ml-3 text-xs text-gold">
          Export CSV
        </a>
      </form>
      <div className="mt-4 flex gap-2 text-sm">
        {["pending", "active", "rejected", "suspended", ""].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1 ${filter === s ? "bg-header text-white" : "bg-chip"}`}
          >
            {s || "all"}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-chip text-xs uppercase text-neutral-600">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Verified</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <a href={`/admin/buyers/${row.id}`} className="text-gold">
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">
                  {row.status}
                  {row.duplicate_hint ? (
                    <span className="mt-1 block text-xs text-red-700">{row.duplicate_hint}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{row.email_verified ? "yes" : "unverified"}</td>
                <td className="px-3 py-2">{row.lead_source}</td>
                <td className="px-3 py-2 text-right">
                  {row.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        className="text-gold hover:text-gold-hover"
                        onClick={() => act(row.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-red-700"
                        onClick={() => act(row.id, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  ) : row.status === "active" ? (
                    <button type="button" className="text-red-700" onClick={() => act(row.id, "suspend")}>
                      Suspend
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No buyers in this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
