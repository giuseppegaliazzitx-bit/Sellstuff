import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";

interface Metrics {
  counts: Record<string, number>;
  contract_board: { id: string; address1: string; days_left: number; urgent: boolean }[];
  median_dom_days: number | null;
  last_7d: { views: number; chats: number; offers: number };
  funnel: { views: number; interests: number; offers: number; accepted: number };
  blasts: { id: string; subject: string; sent: number; clicked: number; bounced: number; total: number }[];
  contact_leaderboard: { deal_id: string; address1: string; clicks: number }[];
  tier_conversion: Record<string, { buyers: number; closed: number }>;
  lead_sources: Record<string, { buyers: number; closed: number }>;
}

export function MetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);

  useEffect(() => {
    apiJson<Metrics>("/api/v1/admin/metrics/overview").then(setData).catch(() => undefined);
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
        <div className="rounded bg-white px-3 py-2 shadow-sm">median DOM: {data.median_dom_days ?? "—"}d</div>
      </div>
      <h2 className="mt-8 text-lg font-medium">Last 7 days</h2>
      <p className="text-sm text-neutral-600">
        views {data.last_7d.views} · chats {data.last_7d.chats} · offers {data.last_7d.offers}
      </p>
      <h2 className="mt-6 text-lg font-medium">Funnel</h2>
      <p className="text-sm text-neutral-600">
        views {data.funnel.views} → interest {data.funnel.interests} → offers {data.funnel.offers} → accepted{" "}
        {data.funnel.accepted}
      </p>
      <h2 className="mt-8 text-lg font-medium">Contract clock</h2>
      <ul className="mt-2 text-sm">
        {data.contract_board.map((row) => (
          <li key={row.id} className={row.urgent ? "text-red-700" : ""}>
            {row.address1} — {row.days_left} days
          </li>
        ))}
        {data.contract_board.length === 0 ? <li className="text-neutral-500">No live clocks.</li> : null}
      </ul>
      <h2 className="mt-8 text-lg font-medium">Blasts</h2>
      <ul className="mt-2 text-sm">
        {data.blasts.map((b) => (
          <li key={b.id}>
            {b.subject}: {b.sent}/{b.total} sent · {b.clicked} clicked · {b.bounced} bounced
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-medium">Contact clicks</h2>
      <ul className="mt-2 text-sm">
        {data.contact_leaderboard.map((c) => (
          <li key={c.deal_id}>
            {c.address1 || c.deal_id} — {c.clicks}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-medium">Tiers / lead source</h2>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <ul>
          {Object.entries(data.tier_conversion).map(([tier, row]) => (
            <li key={tier}>
              tier {tier}: {row.buyers} buyers · {row.closed} closed
            </li>
          ))}
        </ul>
        <ul>
          {Object.entries(data.lead_sources).map(([src, row]) => (
            <li key={src}>
              {src}: {row.buyers} · {row.closed} closed
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
