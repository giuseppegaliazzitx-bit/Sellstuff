import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import { useAuth } from "../../shared/auth";
import type { DealPublic, MarketManager, MarketOut } from "../../shared/api/types";
import { BrowseMap } from "../browse/BrowseMap";
import { ManagerContacts } from "../browse/ManagerContacts";
import { DealPhotos } from "./DealPhotos";
import { DealNotices } from "./DealNotices";

export function DealPage() {
  const { id } = useParams();
  if (!id) return <p className="p-8 text-sm text-neutral-500">Missing deal.</p>;
  return <DealView id={id} />;
}

function backFromLocation(loc: ReturnType<typeof useLocation>) {
  const from = (loc.state as { from?: string } | null)?.from;
  if (from && from.startsWith("/app/") && !from.startsWith("/app/deals")) return from;
  return `/app/browse${loc.search}`;
}

function labelForBack(path: string) {
  return path.startsWith("/app/saved") ? "Back to Saved" : "Back to Browse";
}

export function DealView({
  id,
  variant = "page",
  onClose,
  manager: managerProp,
  backLabel,
}: {
  id: string;
  variant?: "page" | "modal";
  onClose?: () => void;
  manager?: MarketManager | null;
  backLabel?: string;
}) {
  const loc = useLocation();
  const { user } = useAuth();
  const [deal, setDeal] = useState<DealPublic | null>(null);
  const [notices, setNotices] = useState<{ slug: string; title: string; body: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<{ id: string; kind: string; filename: string }[]>([]);
  const [fetchedManager, setFetchedManager] = useState<MarketManager | null>(null);
  const back = backFromLocation(loc);
  const backText = backLabel ?? labelForBack(back);
  const manager = managerProp === undefined ? fetchedManager : managerProp;

  useEffect(() => {
    apiJson<DealPublic>(`/api/v1/deals/${id}`)
      .then(setDeal)
      .catch((e: Error) => setError(e.message));
    apiJson<{ slug: string; title: string; body: string }[]>("/api/v1/notices")
      .then(setNotices)
      .catch(() => setNotices([]));
    apiJson<{ id: string; kind: string; filename: string }[]>(`/api/v1/deals/${id}/documents`)
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [id]);

  useEffect(() => {
    if (managerProp !== undefined || !deal?.market_id) return;
    apiJson<MarketOut[]>("/api/v1/markets")
      .then((rows) => {
        const m = rows.find((r) => r.id === deal.market_id);
        setFetchedManager(m?.manager ?? null);
      })
      .catch(() => setFetchedManager(null));
  }, [deal?.market_id, managerProp]);

  if (error) return <p className="p-8 text-sm text-red-700">{error}</p>;
  if (!deal) return <p className="p-8 text-sm text-neutral-500">Loading…</p>;

  return (
    <div
      className={
        variant === "modal"
          ? "flex w-full max-w-[1000px] flex-1 flex-col bg-page shadow-2xl"
          : "mx-auto flex w-full max-w-[1000px] flex-col bg-page"
      }
      data-testid="deal-page-stack"
      tabIndex={-1}
    >
      <header
        className="sticky top-0 z-10 flex flex-row flex-wrap items-center justify-between gap-3 bg-header px-3 py-2 text-white shadow-md"
        data-testid="deal-header-app-bar"
      >
        {variant === "modal" ? (
          <button
            type="button"
            className="flex shrink-0 flex-row items-center gap-1 text-sm text-white"
            onClick={onClose}
          >
            <BackArrow />
            {backText}
          </button>
        ) : (
          <Link to={back} className="flex shrink-0 flex-row items-center gap-1 text-sm text-white">
            <BackArrow />
            {backText}
          </Link>
        )}
        <div className="min-w-0 flex-1" data-testid="market-agent-card">
          <ManagerContacts manager={manager ?? null} tone="dark" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-3 pt-3">
        <DealPhotos photos={deal.photos} />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 py-6 lg:flex-col">
        <div className="flex flex-1 flex-col rounded-lg bg-card p-5 shadow-sm" data-testid={`deal-card-${deal.id}`}>
          <div className="flex flex-row flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-4xl font-semibold tracking-tight" data-testid="deal-price">
              {formatUsd(deal.list_price_cents)}
            </h2>
            <button
              type="button"
              className="text-sm text-gold"
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

          <div className="flex flex-col gap-6 md:flex-row md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              {deal.reduced_cents ? (
                <p className="text-sm text-neutral-500">Reduced {formatUsd(deal.reduced_cents)}</p>
              ) : null}
              <p className="mt-2 text-base font-medium" data-testid="deal-address">
                {deal.address1}, {deal.city}, {deal.state} {deal.postal_code}
              </p>
              <div className="mt-4 flex flex-row flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
                {deal.year_built ? (
                  <p data-testid="deal-year-built">Built in {deal.year_built}</p>
                ) : null}
                <p data-testid="deal-beds">
                  {deal.beds} {deal.beds === 1 ? "Bed" : "Beds"}
                </p>
                <p data-testid="deal-baths">
                  {deal.baths} {deal.baths === 1 ? "Bath" : "Baths"}
                </p>
                <p data-testid="deal-sqft">{deal.sqft.toLocaleString()} Sq. Ft.</p>
              </div>
              <p className="mt-3 text-sm" data-testid="arv">
                ARV {formatUsd(deal.arv_cents)}
              </p>
            </div>

            <div className="min-w-0 flex-1 md:max-w-md flex-col">
              <Description text={deal.description} />
            </div>
          </div>


          {deal.video_url ? <VideoEmbed url={deal.video_url} /> : null}
        </div>

        {docs.length ? (
          <div className="flex w-full flex-col lg:w-80 lg:shrink-0">
            <DocList docs={docs} />
          </div>
        ) : null}
      </div>

      {deal.lat != null && deal.lng != null ? (
        <div className="mx-auto mb-6 w-full max-w-6xl px-3" data-testid="deal-map">
          <div className="h-72 overflow-hidden rounded border">
            <BrowseMap
              pins={[
                {
                  id: deal.id,
                  lat: deal.lat,
                  lng: deal.lng,
                  list_price_cents: deal.list_price_cents,
                  price_label: `${deal.address1}, ${deal.city}`,
                  status: deal.status,
                  reduced: Boolean(deal.reduced_cents),
                  offers_due_at: deal.offers_due_at,
                },
              ]}
              satellite={false}
              focus
            />
          </div>
        </div>
      ) : null}

      <DealNotices extras={notices} />
      {user?.role === "admin" ? (
        <p className="mx-auto w-full max-w-6xl px-3 pb-8 text-xs text-neutral-400">
          Preview as client is this page — rehab never appears here.
        </p>
      ) : null}
    </div>
  );
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  return (
    <div className="mt-5 flex flex-col" data-testid="deal-description">
      <strong className="font-extrabold">Description</strong>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {open || !long ? text : `${text.slice(0, 280).trimEnd()}…`}
      </p>
      {long ? (
        <button type="button" className="mt-2 text-sm text-gold" onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function DocList({ docs }: { docs: { id: string; kind: string; filename: string }[] }) {
  const packets = docs.filter((d) => d.kind === "packet");
  const others = docs.filter((d) => d.kind !== "packet");
  return (
    <div className="mt-4 text-sm">
      {packets.length ? (
        <div>
          <p className="font-medium">Document Packet</p>
          {packets.map((d) => (
            <a key={d.id} className="mt-1 block text-gold" href={`/api/v1/documents/${d.id}/download`}>
              {d.filename}
            </a>
          ))}
        </div>
      ) : null}
      {others.length ? (
        <div className="mt-3">
          <p className="font-medium">Individual Documents</p>
          {others.map((d) => (
            <a key={d.id} className="mt-1 block text-gold" href={`/api/v1/documents/${d.id}/download`}>
              {d.filename}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M11.67 3.87 9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z" />
    </svg>
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
