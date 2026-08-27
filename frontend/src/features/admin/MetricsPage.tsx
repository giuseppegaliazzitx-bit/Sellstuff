import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Metrics>("/api/v1/admin/metrics/overview")
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="p-8 text-sm text-red-700">{err}</p>;
  if (!data) return <p className="p-8 text-sm text-neutral-500">Loading metrics…</p>;

  const live = (data.counts.available || 0) + (data.counts.pending || 0);
  const funnelMax = Math.max(data.funnel.views, data.funnel.interests, data.funnel.offers, data.funnel.accepted, 1);
  const funnel = [
    { label: "Views", value: data.funnel.views },
    { label: "Interest", value: data.funnel.interests },
    { label: "Offers", value: data.funnel.offers },
    { label: "Accepted", value: data.funnel.accepted },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Desk metrics</h1>
      <p className="mt-1 text-sm text-neutral-500">Inventory health, buyer activity, and contract clocks.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Live listings" value={String(live)} hint="available + pending" />
        <Kpi label="Median DOM" value={data.median_dom_days != null ? `${data.median_dom_days}d` : "—"} hint="days on market" />
        <Kpi label="Views · 7d" value={String(data.last_7d.views)} hint={`${data.last_7d.chats} desk questions`} />
        <Kpi label="Offers · 7d" value={String(data.last_7d.offers)} hint="submitted this week" />
      </div>

      <div className="mt-4 flex flex-row flex-wrap gap-2">
        {Object.entries(data.counts).map(([k, v]) => (
          <span key={k} className="rounded-full bg-chip px-3 py-1 text-xs font-medium text-neutral-700">
            {k.replace("_", " ")} · {v}
          </span>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Buyer funnel</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {funnel.map((row) => (
              <li key={row.label}>
                <div className="flex flex-row justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round((row.value / funnelMax) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Contract clock</h2>
          {data.contract_board.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No close dates on live inventory.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-neutral-500">
                  <th className="py-1">Address</th>
                  <th className="py-1">Days left</th>
                </tr>
              </thead>
              <tbody>
                {data.contract_board.map((row) => (
                  <tr key={row.id} className={row.urgent ? "text-red-700" : ""}>
                    <td className="py-1">
                      <Link to={`/admin/deals/${row.id}`} className="text-gold">
                        {row.address1}
                      </Link>
                    </td>
                    <td className="py-1 font-medium">{row.days_left}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Blasts</h2>
          {data.blasts.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No campaigns yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {data.blasts.map((b) => (
                <li key={b.id} className="flex flex-row justify-between gap-3 border-b border-amber-900/10 py-2 last:border-0">
                  <span className="truncate font-medium">{b.subject || "Untitled"}</span>
                  <span className="shrink-0 text-neutral-500">
                    {b.sent}/{b.total} sent · {b.clicked} clicked
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Contact clicks</h2>
          {data.contact_leaderboard.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No agent contact copies yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {data.contact_leaderboard.map((c) => (
                <li key={c.deal_id} className="flex flex-row justify-between">
                  <span>{c.address1 || c.deal_id}</span>
                  <span className="font-medium">{c.clicks}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Tiers</h2>
          <ul className="mt-3 text-sm">
            {Object.keys(data.tier_conversion).length === 0 ? (
              <li className="text-neutral-500">No buyer tiers yet.</li>
            ) : (
              Object.entries(data.tier_conversion).map(([tier, row]) => (
                <li key={tier} className="flex flex-row justify-between py-1">
                  <span>Tier {tier}</span>
                  <span>
                    {row.buyers} buyers · {row.closed} closed
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Lead sources</h2>
          <ul className="mt-3 text-sm">
            {Object.keys(data.lead_sources).length === 0 ? (
              <li className="text-neutral-500">No sources yet.</li>
            ) : (
              Object.entries(data.lead_sources).map(([src, row]) => (
                <li key={src} className="flex flex-row justify-between py-1">
                  <span>{src}</span>
                  <span>
                    {row.buyers} · {row.closed} closed
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}
