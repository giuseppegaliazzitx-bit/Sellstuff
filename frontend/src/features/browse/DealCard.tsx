import { Link, useLocation } from "react-router-dom";
import { formatUsd } from "../../shared/money";
import type { DealPublic } from "../../shared/api/types";

export function DealCard({
  deal,
  search,
  onOpen,
}: {
  deal: DealPublic;
  search?: string;
  onOpen?: (id: string) => void;
}) {
  const loc = useLocation();
  const href = `/app/deals/${deal.id}${search || ""}`;
  const from = `${loc.pathname}${loc.search}`;
  const body = (
    <>
      <div className="relative flex h-40 flex-col bg-chip">
        {deal.cover_photo ? (
          <img src={deal.cover_photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center text-xs text-neutral-400">No photo</div>
        )}
        <div className="absolute left-2 top-2 flex flex-row flex-wrap gap-1">
          {deal.reduced_cents ? (
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium">Reduced</span>
          ) : null}
        </div>
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {deal.offers_due_at ? (
            <span className="rounded bg-gold px-2 py-0.5 text-xs text-white">Offers due</span>
          ) : null}
          {deal.early_access ? (
            <span className="rounded bg-header px-2 py-0.5 text-xs text-white">Early access</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-2xl font-semibold tracking-tight" data-testid="card-price">
          {formatUsd(deal.list_price_cents)}
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          {deal.address1}, {deal.city}
        </p>
        <div className="mt-2 flex flex-row flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-chip px-2 py-1">{deal.beds} bd</span>
          <span className="rounded-full bg-chip px-2 py-1">{deal.baths} ba</span>
          <span className="rounded-full bg-chip px-2 py-1">{deal.sqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </>
  );
  const cls =
    "flex w-full flex-col overflow-hidden rounded-xl border border-amber-900/10 bg-card text-left shadow-sm";
  if (onOpen) {
    return (
      <button type="button" className={cls} data-testid="deal-card" onClick={() => onOpen(deal.id)}>
        {body}
      </button>
    );
  }
  return (
    <Link to={href} state={{ from }} className={cls} data-testid="deal-card">
      {body}
    </Link>
  );
}
