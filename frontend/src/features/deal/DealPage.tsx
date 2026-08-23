import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";
import type { DealPublic } from "../../shared/api/types";

export function DealPage() {
  const { id } = useParams();
  const loc = useLocation();
  const cfg = useConfig();
  const { user } = useAuth();
  const [deal, setDeal] = useState<DealPublic | null>(null);
  const [notices, setNotices] = useState<{ slug: string; title: string; body: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const back = `/app/browse${loc.search}`;

  useEffect(() => {
    if (!id) return;
    apiJson<DealPublic>(`/api/v1/deals/${id}`)
      .then(setDeal)
      .catch((e: Error) => setError(e.message));
    apiJson<{ slug: string; title: string; body: string }[]>("/api/v1/notices")
      .then(setNotices)
      .catch(() => setNotices([]));
  }, [id]);

  if (error) return <p className="p-8 text-sm text-red-700">{error}</p>;
  if (!deal) return <p className="p-8 text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to={back} className="text-sm text-gold">
        Back to Browse
      </Link>
      <div className="mt-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          {deal.address1}, {deal.city}
        </h1>
        <div className="flex gap-3 text-sm">
          {cfg.support_phone ? (
            <a
              href={`tel:${cfg.support_phone}`}
              onClick={() =>
                apiJson(`/api/v1/deals/${deal.id}/contact-events`, {
                  method: "POST",
                  body: JSON.stringify({ kind: "call_clicked" }),
                })
              }
              className="text-gold"
            >
              Call
            </a>
          ) : (
            <button
              type="button"
              className="text-gold"
              onClick={() =>
                apiJson(`/api/v1/deals/${deal.id}/contact-events`, {
                  method: "POST",
                  body: JSON.stringify({ kind: "call_clicked" }),
                })
              }
            >
              Call
            </button>
          )}
          <Link to={`/app/chat?deal=${deal.id}`} className="text-gold">
            Chat
          </Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {deal.photos.map((src) => (
          <img key={src} src={src} alt="" className="h-36 w-full rounded object-cover" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-3xl font-semibold" data-testid="list-price">
            {formatUsd(deal.list_price_cents)}
          </p>
          {deal.reduced_cents ? (
            <p className="text-sm text-neutral-500">
              Reduced {formatUsd(deal.reduced_cents)}
            </p>
          ) : null}
          <p className="mt-2 text-sm" data-testid="arv">
            ARV {formatUsd(deal.arv_cents)}
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            {deal.beds} bd · {deal.baths} ba · {deal.sqft} sqft · {deal.year_built} · {deal.occupancy}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm">{deal.description}</p>
          {deal.video_url ? (
            <p className="mt-4 text-sm">
              <a href={deal.video_url} className="text-gold" target="_blank" rel="noreferrer">
                Video walkthrough
              </a>
            </p>
          ) : null}
        </div>
        <div>
          <button
            type="button"
            className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white"
            onClick={() => apiJson(`/api/v1/deals/${deal.id}/interests`, { method: "POST", body: "{}" })}
          >
            I’m interested
          </button>
          <OfferBox dealId={deal.id} />
        </div>
      </div>
      <div className="mt-8">
        {notices.map((n) => (
          <details key={n.slug} className="border-b py-3">
            <summary className="cursor-pointer text-sm font-medium">{n.title}</summary>
            <p className="mt-2 text-sm text-neutral-600">{n.body}</p>
            {n.slug === "tx-equitable-interest" ? (
              <button
                type="button"
                className="mt-2 text-xs text-gold"
                onClick={() =>
                  apiJson(`/api/v1/deals/${deal.id}/acknowledge`, { method: "POST", body: "{}" })
                }
              >
                I acknowledge
              </button>
            ) : null}
          </details>
        ))}
      </div>
      {user?.role === "admin" ? (
        <p className="mt-8 text-xs text-neutral-400">
          Preview as client is this page — rehab never appears here.
        </p>
      ) : null}
    </div>
  );
}

function OfferBox({ dealId }: { dealId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="mt-4 flex flex-col gap-2 rounded border bg-white p-4 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const dollars = Number(fd.get("amount"));
        try {
          await apiJson(`/api/v1/deals/${dealId}/offers`, {
            method: "POST",
            body: JSON.stringify({
              amount_cents: Math.round(dollars * 100),
              emd_cents: Math.round(Number(fd.get("emd") || 0) * 100),
              close_days: Number(fd.get("close_days") || 14),
            }),
          });
          setMsg("Offer submitted");
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Offer failed");
        }
      }}
    >
      <p className="font-medium">Offer</p>
      {msg ? <p className="text-xs">{msg}</p> : null}
      <input name="amount" type="number" required placeholder="Amount USD" className="rounded border px-2 py-1" />
      <input name="emd" type="number" placeholder="EMD USD" className="rounded border px-2 py-1" />
      <input name="close_days" type="number" defaultValue={14} className="rounded border px-2 py-1" />
      <button type="submit" className="rounded bg-header px-3 py-1 text-white">
        Submit offer
      </button>
    </form>
  );
}
