import { useEffect, useState } from "react";
import { apiJson } from "../../shared/api/client";
import type { DealPublic } from "../../shared/api/types";
import { DealCard } from "../browse/DealCard";
import { DealModal } from "../deal/DealModal";

export function SavedPage() {
  const [deals, setDeals] = useState<DealPublic[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    apiJson<DealPublic[]>("/api/v1/me/saves").then(setDeals).catch(() => setDeals([]));
  }, []);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} onOpen={setOpenId} />
        ))}
        {deals.length === 0 ? <p className="text-sm text-neutral-500">No saved deals yet.</p> : null}
      </div>
      {openId ? (
        <DealModal dealId={openId} onClose={() => setOpenId(null)} backLabel="Back to Saved" />
      ) : null}
    </div>
  );
}
