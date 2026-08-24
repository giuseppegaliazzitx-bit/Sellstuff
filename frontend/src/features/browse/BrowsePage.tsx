import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import type { DealPublic, MapPin, MarketOut } from "../../shared/api/types";
import { DealCard } from "./DealCard";
import { BrowseMap } from "./BrowseMap";
import { CopyContact } from "./CopyContact";
import { DealModal } from "../deal/DealModal";

const SORTS = [
  { value: "price_asc", label: "Price (low to high)" },
  { value: "price_desc", label: "Price (high to low)" },
  { value: "beds", label: "Beds" },
  { value: "baths", label: "Baths" },
  { value: "sqft", label: "Sq footage" },
];

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [deals, setDeals] = useState<DealPublic[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [sat, setSat] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const market = params.get("market") || "";
  const sort = params.get("sort") || "price_asc";
  const current = markets.find((m) => m.slug === market) || markets[0];

  useEffect(() => {
    apiJson<MarketOut[]>("/api/v1/markets").then(setMarkets).catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    const marketId = current?.id;
    if (!marketId && markets.length === 0) return;
    const q = new URLSearchParams();
    if (marketId) q.set("market_id", marketId);
    q.set("sort", sort);
    const qs = q.toString();
    apiJson<DealPublic[]>(`/api/v1/deals?${qs}`).then(setDeals).catch(() => setDeals([]));
    apiJson<MapPin[]>(`/api/v1/map/pins?${qs}`).then(setPins).catch(() => setPins([]));
  }, [markets, market, sort, current?.id]);

  const search = `?${params.toString()}`;
  const mgr = current?.manager;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-0 w-full flex-1 flex-col lg:w-1/2">
        <div className="flex shrink-0 flex-col gap-3 border-b bg-white px-4 py-3">
          {mgr ? (
            <div className="flex flex-row items-center justify-between gap-3">
              <div className="flex min-w-0 flex-row items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip text-sm font-semibold text-header">
                  {mgr.photo_url ? (
                    <img src={mgr.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(mgr.name)
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-semibold">{mgr.name}</p>
                  {mgr.license ? <p className="text-xs text-neutral-500">{mgr.license}</p> : null}
                </div>
              </div>
              <div className="flex flex-row items-center gap-1 text-header">
                {mgr.phone ? (
                  <CopyContact value={mgr.phone} label="phone">
                    <MsgIcon />
                  </CopyContact>
                ) : null}
                {mgr.phone ? (
                  <CopyContact value={mgr.phone} label="phone">
                    <PhoneIcon />
                  </CopyContact>
                ) : null}
                {mgr.email ? (
                  <CopyContact value={mgr.email} label="email">
                    <MailIcon />
                  </CopyContact>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Your Market
              <select
                value={market || markets[0]?.slug || ""}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  next.set("market", e.target.value);
                  setParams(next);
                }}
                className="rounded border px-2 py-2 text-sm font-normal normal-case text-neutral-900"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Sort Options
              <select
                value={sort}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  next.set("sort", e.target.value);
                  setParams(next);
                }}
                className="rounded border px-2 py-2 text-sm font-normal normal-case text-neutral-900"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-row flex-wrap content-start gap-4 overflow-y-auto p-4">
          {deals.map((d) => (
            <div key={d.id} className="flex w-full sm:w-[calc(50%-0.5rem)]">
              <DealCard deal={d} search={search} onOpen={setOpenId} />
            </div>
          ))}
          {deals.length === 0 ? (
            <p className="text-sm text-neutral-500">No live deals in this market.</p>
          ) : null}
        </div>
      </div>
      <div className="relative flex h-72 w-full shrink-0 flex-col lg:h-full lg:w-1/2">
        <div className="absolute right-3 top-3 z-[400] flex flex-row gap-1">
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs ${sat ? "bg-white" : "bg-header text-white"}`}
            onClick={() => setSat(false)}
          >
            Map
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs ${sat ? "bg-header text-white" : "bg-white"}`}
            onClick={() => setSat(true)}
          >
            Satellite
          </button>
        </div>
        <BrowseMap
          pins={pins}
          satellite={sat}
          onSelect={(id) => setOpenId(id)}
        />
      </div>
      {openId ? <DealModal dealId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function MsgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-2 12H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1m-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m4.5-4H7V4h9z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 4-8 5-8-5V6l8 5 8-5z" />
    </svg>
  );
}
