import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import type { DealPublic, MapPin, MarketOut } from "../../shared/api/types";
import { DealCard } from "./DealCard";
import { BrowseMap } from "./BrowseMap";

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [deals, setDeals] = useState<DealPublic[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [sat, setSat] = useState(false);
  const market = params.get("market") || "";
  const sort = params.get("sort") || "newest";
  const priceMax = params.get("price_max") || "";
  const bedsMin = params.get("beds_min") || "";

  useEffect(() => {
    apiJson<MarketOut[]>("/api/v1/markets").then(setMarkets).catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    const marketId = markets.find((m) => m.slug === market)?.id || markets[0]?.id;
    if (!marketId && markets.length === 0) return;
    const q = new URLSearchParams();
    if (marketId) q.set("market_id", marketId);
    q.set("sort", sort);
    if (priceMax) q.set("price_max", priceMax);
    if (bedsMin) q.set("beds_min", bedsMin);
    const qs = q.toString();
    apiJson<DealPublic[]>(`/api/v1/deals?${qs}`).then(setDeals).catch(() => setDeals([]));
    apiJson<MapPin[]>(`/api/v1/map/pins?${qs}`).then(setPins).catch(() => setPins([]));
  }, [markets, market, sort, priceMax, bedsMin]);

  const search = `?${params.toString()}`;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row">
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-3 text-sm">
          <label>
            Market{" "}
            <select
              value={market || markets[0]?.slug || ""}
              onChange={(e) => {
                params.set("market", e.target.value);
                setParams(params);
              }}
              className="rounded border px-2 py-1"
            >
              {markets.map((m) => (
                <option key={m.id} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            placeholder="Max $"
            defaultValue={priceMax ? Number(priceMax) / 100 : ""}
            className="w-24 rounded border px-2 py-1"
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              const v = Number(e.target.value);
              if (v) next.set("price_max", String(Math.round(v * 100)));
              else next.delete("price_max");
              setParams(next);
            }}
          />
          <input
            type="number"
            placeholder="Beds min"
            defaultValue={bedsMin}
            className="w-20 rounded border px-2 py-1"
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("beds_min", e.target.value);
              else next.delete("beds_min");
              setParams(next);
            }}
          />
          <label>
            Sort{" "}
            <select
              value={sort}
              onChange={(e) => {
                params.set("sort", e.target.value);
                setParams(params);
              }}
              className="rounded border px-2 py-1"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price (low to high)</option>
              <option value="price_desc">Price (high to low)</option>
              <option value="sqft">Sqft</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} search={search} />
          ))}
          {deals.length === 0 ? (
            <p className="text-sm text-neutral-500">No live deals in this market.</p>
          ) : null}
        </div>
      </div>
      <div className="relative h-80 lg:h-auto lg:w-1/2">
        <div className="absolute right-3 top-3 z-[400] flex gap-1">
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
