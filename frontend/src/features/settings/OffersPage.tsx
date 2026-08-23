import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";

interface Row {
  id: string;
  deal_id: string;
  amount_cents: number;
  status: string;
}

export function MyOffersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    apiJson<Row[]>("/api/v1/me/offers").then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My offers</h1>
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between rounded border bg-white p-3">
            <span>
              {formatUsd(r.amount_cents)} · {r.status}
            </span>
            {r.status === "submitted" || r.status === "countered" ? (
              <button
                type="button"
                className="text-red-700"
                onClick={async () => {
                  await apiJson(`/api/v1/offers/${r.id}/withdraw`, { method: "POST", body: "{}" });
                  setRows(await apiJson<Row[]>("/api/v1/me/offers"));
                }}
              >
                Withdraw
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
