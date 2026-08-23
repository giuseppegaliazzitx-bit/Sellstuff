import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";
import type { DealPublic } from "../../shared/api/types";
import { BrowseMap } from "../browse/BrowseMap";

export function DealPage() {
  const { id } = useParams();
  const loc = useLocation();
  const cfg = useConfig();
  const { user } = useAuth();
  const [deal, setDeal] = useState<DealPublic | null>(null);
  const [notices, setNotices] = useState<{ slug: string; title: string; body: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<{ id: string; kind: string; filename: string }[]>([]);
  const [windows, setWindows] = useState<{ id: string; starts_at: string; capacity: number; status: string }[]>(
    [],
  );
  const [light, setLight] = useState<string | null>(null);
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const back = `/app/browse${loc.search}`;

  useEffect(() => {
    if (!id) return;
    apiJson<DealPublic>(`/api/v1/deals/${id}`)
      .then(setDeal)
      .catch((e: Error) => setError(e.message));
    apiJson<{ slug: string; title: string; body: string }[]>("/api/v1/notices")
      .then(setNotices)
      .catch(() => setNotices([]));
    apiJson<{ id: string; kind: string; filename: string }[]>(`/api/v1/deals/${id}/documents`)
      .then(setDocs)
      .catch(() => setDocs([]));
    apiJson<{ id: string; starts_at: string; capacity: number; status: string }[]>(
      `/api/v1/deals/${id}/showing-windows`,
    )
      .then(setWindows)
      .catch(() => setWindows([]));
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
          <button
            type="button"
            className="text-gold"
            onClick={async () => {
              if (deal.saved) {
                await apiJson(`/api/v1/deals/${deal.id}/saves`, { method: "DELETE" });
                setDeal({ ...deal, saved: false });
              } else {
                await apiJson(`/api/v1/deals/${deal.id}/saves`, { method: "POST", body: "{}" });
                setDeal({ ...deal, saved: true });
              }
            }}
          >
            {deal.saved ? "★ Saved" : "☆ Save"}
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {deal.photos.map((src) => (
          <button key={src} type="button" onClick={() => setLight(src)}>
            <img src={src} alt="" className="h-36 w-full rounded object-cover" />
          </button>
        ))}
      </div>
      {light ? (
        <button
          type="button"
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80"
          onClick={() => setLight(null)}
        >
          <img src={light} alt="" className="max-h-[90vh] max-w-[90vw]" />
        </button>
      ) : null}
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
          {deal.video_url ? <VideoEmbed url={deal.video_url} /> : null}
          {deal.early_access ? (
            <p className="mt-3 text-xs uppercase tracking-wide text-gold">Early access</p>
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
          <form
            className="mt-4 rounded border bg-white p-4 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = String(new FormData(e.currentTarget).get("body") || "");
              try {
                await apiJson("/api/v1/mail/outbound", {
                  method: "POST",
                  body: JSON.stringify({ subject: `Re: ${deal.address1}`, body, lane: 1 }),
                });
                setMailMsg("Email queued (sandbox .eml if mail is blank).");
              } catch (err) {
                setMailMsg(err instanceof Error ? err.message : "Send failed");
              }
            }}
          >
            <p className="font-medium">Email the desk</p>
            {mailMsg ? <p className="text-xs">{mailMsg}</p> : null}
            <textarea name="body" required className="mt-2 w-full rounded border px-2 py-1" rows={3} />
            <button type="submit" className="mt-2 rounded bg-header px-3 py-1 text-white">
              Send
            </button>
          </form>
          {windows.length ? (
            <div className="mt-4 text-sm">
              <p className="font-medium">Showings</p>
              {windows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="mt-1 block text-gold"
                  onClick={() =>
                    apiJson(`/api/v1/showing-windows/${w.id}/rsvp`, { method: "POST", body: "{}" })
                  }
                >
                  RSVP {new Date(w.starts_at).toLocaleString()}
                </button>
              ))}
            </div>
          ) : null}
          {docs.length ? (
            <div className="mt-4 text-sm">
              <p className="font-medium">Documents</p>
              {docs.map((d) => (
                <a
                  key={d.id}
                  className="mt-1 block text-gold"
                  href={`/api/v1/documents/${d.id}/download`}
                >
                  {d.filename}
                </a>
              ))}
            </div>
          ) : null}
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
      {deal.lat != null && deal.lng != null ? (
        <div className="mt-8 h-56 overflow-hidden rounded border">
          <BrowseMap
            pins={[
              {
                id: deal.id,
                lat: deal.lat,
                lng: deal.lng,
                list_price_cents: deal.list_price_cents,
                price_label: formatUsd(deal.list_price_cents),
                status: deal.status,
                reduced: Boolean(deal.reduced_cents),
                offers_due_at: deal.offers_due_at,
              },
            ]}
            satellite={false}
          />
        </div>
      ) : null}
      {user?.role === "admin" ? (
        <p className="mt-8 text-xs text-neutral-400">
          Preview as client is this page — rehab never appears here.
        </p>
      ) : null}
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  let src = "";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || "";
      src = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (host.includes("vimeo")) {
      src = `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop() || ""}`;
    } else if (host.includes("matterport")) {
      src = url;
    }
  } catch {
    src = "";
  }
  if (!src) {
    return (
      <p className="mt-4 text-sm">
        <a href={url} className="text-gold" target="_blank" rel="noreferrer">
          Video walkthrough
        </a>
      </p>
    );
  }
  return (
    <iframe
      title="Walkthrough"
      src={src}
      className="mt-4 aspect-video w-full rounded border"
      allow="fullscreen; picture-in-picture"
    />
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
      <input name="amount" type="number" min={0} required placeholder="Amount USD" className="rounded border px-2 py-1" />
      <input name="emd" type="number" min={0} placeholder="EMD USD" className="rounded border px-2 py-1" />
      <input name="close_days" type="number" min={0} defaultValue={14} className="rounded border px-2 py-1" />
      <button type="submit" className="rounded bg-header px-3 py-1 text-white">
        Submit offer
      </button>
    </form>
  );
}
