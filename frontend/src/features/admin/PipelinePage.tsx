import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";

interface OfferRow {
  id: string;
  deal_id: string;
  user_id: string;
  amount_cents: number;
  emd_cents: number;
  status: string;
  rank: number | null;
  is_late: boolean;
}

export function PipelinePage() {
  const [rows, setRows] = useState<OfferRow[]>([]);

  async function load() {
    setRows(await apiJson<OfferRow[]>("/api/v1/admin/offers"));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Offers</h1>
      <table className="mt-4 min-w-full text-left text-sm">
        <thead>
          <tr className="bg-chip text-xs uppercase">
            <th className="px-2 py-2">Amount</th>
            <th className="px-2 py-2">EMD</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Late</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-2 py-2">{formatUsd(r.amount_cents)}</td>
              <td className="px-2 py-2">{formatUsd(r.emd_cents)}</td>
              <td className="px-2 py-2">{r.status}</td>
              <td className="px-2 py-2">{r.is_late ? "late" : ""}</td>
              <td className="px-2 py-2">
                {r.status === "submitted" ? (
                  <button
                    type="button"
                    className="text-gold"
                    onClick={async () => {
                      await apiJson(`/api/v1/admin/offers/${r.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "accepted" }),
                      });
                      await load();
                    }}
                  >
                    Accept
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
