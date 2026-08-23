import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

export function MetricsPage() {
  const [data, setData] = useState<{
    counts: Record<string, number>;
    contract_board: { id: string; address1: string; days_left: number; urgent: boolean }[];
  } | null>(null);

  useEffect(() => {
    apiJson<{
      counts: Record<string, number>;
      contract_board: { id: string; address1: string; days_left: number; urgent: boolean }[];
    }>("/api/v1/admin/metrics/overview")
      .then(setData)
      .catch(() => undefined);
  }, []);

  if (!data) return <p className="p-8 text-sm">Loading metrics…</p>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Metrics</h1>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {Object.entries(data.counts).map(([k, v]) => (
          <div key={k} className="rounded bg-white px-3 py-2 shadow-sm">
            {k}: {v}
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-medium">Contract clock</h2>
      <ul className="mt-2 text-sm">
        {data.contract_board.map((row) => (
          <li key={row.id} className={row.urgent ? "text-red-700" : ""}>
            {row.address1} — {row.days_left} days
          </li>
        ))}
      </ul>
    </div>
  );
}
