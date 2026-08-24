import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import type { DealPublic, MapPin, MarketOut } from "../../shared/api/types";
import { DealCard } from "./DealCard";
import { BrowseMap } from "./BrowseMap";

const SORTS = [
  { value: "price_asc", label: "Price (low to high)" },
  { value: "price_desc", label: "Price (high to low)" },
  { value: "beds", label: "Beds" },
  { value: "baths", label: "Baths" },
  { value: "sqft", label: "Sq footage" },
];

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [deals, setDeals] = useState<DealPublic[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [sat, setSat] = useState(false);
  const market = params.get("market") || "";
  const sort = params.get("sort") || "price_asc";

  useEffect(() => {
    apiJson<MarketOut[]>("/api/v1/markets").then(setMarkets).catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    const marketId = markets.find((m) => m.slug === market)?.id || markets[0]?.id;
    if (!marketId && markets.length === 0) return;
    const q = new URLSearchParams();
    if (marketId) q.set("market_id", marketId);
    q.set("sort", sort);
    const qs = q.toString();
    apiJson<DealPublic[]>(`/api/v1/deals?${qs}`).then(setDeals).catch(() => setDeals([]));
    apiJson<MapPin[]>(`/api/v1/map/pins?${qs}`).then(setPins).catch(() => setPins([]));
  }, [markets, market, sort]);

  const search = `?${params.toString()}`;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row">
      <div className="flex w-full flex-1 flex-col lg:w-1/2">
        <div className="flex flex-col gap-3 border-b bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end">
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
        <div className="flex flex-1 flex-row flex-wrap content-start gap-4 p-4">
          {deals.map((d) => (
            <div key={d.id} className="flex w-full sm:w-[calc(50%-0.5rem)]">
              <DealCard deal={d} search={search} />
            </div>
          ))}
          {deals.length === 0 ? (
            <p className="text-sm text-neutral-500">No live deals in this market.</p>
          ) : null}
        </div>
      </div>
      <div className="relative flex h-80 w-full flex-col lg:h-auto lg:w-1/2">
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
          onSelect={(id) => navigate(`/app/deals/${id}${search}`)}
        />
      </div>
    </div>
  );
}
