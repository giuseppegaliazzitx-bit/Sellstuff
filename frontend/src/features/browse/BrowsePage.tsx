import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import type { DealPublic, MapPin, MarketOut } from "../../shared/api/types";
import { DealCard } from "./DealCard";
import { BrowseMap } from "./BrowseMap";
import { ManagerContacts } from "./ManagerContacts";
import { MarketSearch } from "./MarketSearch";
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
          <div className="rounded-lg border border-amber-900/10 bg-card px-3 py-2" data-testid="market-agent-card">
            <ManagerContacts manager={mgr ?? null} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <MarketSearch
              markets={markets}
              value={market || markets[0]?.slug || ""}
              onChange={(slug) => {
                const next = new URLSearchParams(params);
                next.set("market", slug);
                setParams(next);
              }}
            />
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
      <div className="relative z-0 isolate flex h-72 w-full shrink-0 flex-col lg:h-full lg:w-1/2">
        <div className="absolute right-3 top-3 z-10 flex flex-row gap-1">
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
      {openId ? <DealModal dealId={openId} onClose={() => setOpenId(null)} manager={mgr ?? null} /> : null}
    </div>
  );
}

