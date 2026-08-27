import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiJson, getCookie } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import type { DealAdmin } from "../../shared/api/types";

export function DealEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [deal, setDeal] = useState<DealAdmin | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setDeal(await apiJson<DealAdmin>(`/api/v1/admin/deals/${id}`));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, [id]);

  if (!deal) return <p className="p-8 text-sm">{msg || "Loading…"}</p>;

  const onMarket =
    deal.days_on_market != null
      ? `${deal.days_on_market} day${deal.days_on_market === 1 ? "" : "s"} on market`
      : "Not published";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin/deals" className="text-sm text-gold">
        Back to inventory
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{deal.address1}</h1>
      <p className="text-sm text-neutral-500" data-testid="desk-on-market">
        {onMarket}
        {deal.published_at ? ` · published ${new Date(deal.published_at).toLocaleDateString()}` : ""}
        {" · "}
        lockbox {deal.lockbox_code || "—"}
        {" · "}
        MAO {formatUsd(deal.mao_cents)}
      </p>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}

      <form
        className="mt-6 flex flex-col gap-3 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const updated = await apiJson<DealAdmin>(`/api/v1/admin/deals/${deal.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              list_price_cents: Math.round(Number(fd.get("price")) * 100),
              arv_cents: Math.round(Number(fd.get("arv")) * 100),
              description: String(fd.get("description")),
              occupancy: String(fd.get("occupancy")),
              lockbox_code: String(fd.get("lockbox")),
              beds: Math.max(0, Number(fd.get("beds") || 0)),
              baths: Math.max(0, Number(fd.get("baths") || 0)),
              sqft: Math.max(0, Number(fd.get("sqft") || 0)),
              year_built: fd.get("year") ? Number(fd.get("year")) : null,
              city: String(fd.get("city")),
              state: String(fd.get("state") || "").toUpperCase(),
              postal_code: String(fd.get("postal") || ""),
              video_url: String(fd.get("video") || "") || null,
              rehab_high_cents: Math.round(Number(fd.get("rehab") || 0) * 100),
            }),
          });
          setDeal(updated);
          setMsg("Saved");
        }}
      >
        <p className="font-medium">Listing (what buyers see)</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="col-span-2 flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            City
            <input
              name="city"
              defaultValue={deal.city}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            State
            <input
              name="state"
              maxLength={2}
              defaultValue={deal.state}
              className="rounded border px-2 py-1 text-sm font-normal uppercase text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            ZIP
            <input
              name="postal"
              defaultValue={deal.postal_code}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
          List price (USD)
          <input
            name="price"
            type="number"
            min={0}
            defaultValue={deal.list_price_cents / 100}
            className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
          ARV (USD)
          <input
            name="arv"
            type="number"
            min={0}
            defaultValue={deal.arv_cents / 100}
            className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Beds
            <input
              name="beds"
              type="number"
              min={0}
              step={1}
              defaultValue={deal.beds}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Baths
            <input
              name="baths"
              type="number"
              min={0}
              step={0.5}
              defaultValue={deal.baths}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Sq. Ft.
            <input
              name="sqft"
              type="number"
              min={0}
              defaultValue={deal.sqft}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Year built
            <input
              name="year"
              type="number"
              min={0}
              defaultValue={deal.year_built || ""}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
          Description
          <textarea
            name="description"
            defaultValue={deal.description}
            rows={6}
            className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
          Walkthrough URL
          <input
            name="video"
            defaultValue={deal.video_url || ""}
            placeholder="YouTube / Vimeo / Matterport"
            className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
          />
        </label>
        <p className="mt-2 font-medium">Desk only (buyers never see this)</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Occupancy
            <input
              name="occupancy"
              defaultValue={deal.occupancy}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Lockbox
            <input
              name="lockbox"
              defaultValue={deal.lockbox_code}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-neutral-500">
            Rehab high (USD)
            <input
              name="rehab"
              type="number"
              min={0}
              defaultValue={deal.rehab_high_cents / 100}
              className="rounded border px-2 py-1 text-sm font-normal normal-case text-neutral-900"
            />
          </label>
        </div>
        <button type="submit" className="self-start rounded bg-gold px-3 py-1 font-semibold text-white">
          Save listing
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <label className="text-gold">
          Add photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              await fetch(`/api/v1/admin/deals/${deal.id}/photos`, {
                method: "POST",
                credentials: "include",
                headers: { "X-CSRF-Token": getCookie("csrf") },
                body: fd,
              });
              await load();
            }}
          />
        </label>
        <label className="text-gold">
          Add packet PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              await fetch(`/api/v1/admin/deals/${deal.id}/documents?kind=packet`, {
                method: "POST",
                credentials: "include",
                headers: { "X-CSRF-Token": getCookie("csrf") },
                body: fd,
              });
              setMsg("PDF uploaded");
            }}
          />
        </label>
        <label className="text-gold">
          Add other PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              await fetch(`/api/v1/admin/deals/${deal.id}/documents?kind=other`, {
                method: "POST",
                credentials: "include",
                headers: { "X-CSRF-Token": getCookie("csrf") },
                body: fd,
              });
              setMsg("PDF uploaded");
            }}
          />
        </label>
        <Link to={`/app/deals/${deal.id}`} className="text-gold">
          Preview as client
        </Link>
        <button
          type="button"
          className="text-gold"
          onClick={async () => {
            try {
              await apiJson(`/api/v1/admin/deals/${deal.id}/geocode`, { method: "POST", body: "{}" });
              await load();
              setMsg("Geocoded");
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Geocode failed");
            }
          }}
        >
          Geocode
        </button>
        <button
          type="button"
          className="text-gold"
          onClick={async () => {
            try {
              const updated = await apiJson<DealAdmin>(`/api/v1/admin/deals/${deal.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "available" }),
              });
              setDeal(updated);
              setMsg("Published");
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Publish failed");
            }
          }}
        >
          Publish
        </button>
        <button
          type="button"
          className="text-red-700"
          onClick={async () => {
            if (!window.confirm(`Delete ${deal.address1}?`)) return;
            await apiJson(`/api/v1/admin/deals/${deal.id}`, { method: "DELETE" });
            nav("/admin/deals");
          }}
        >
          Delete listing
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {deal.photos.map((src) => (
          <img key={src} src={src} alt="" className="h-28 w-full rounded object-cover" />
        ))}
      </div>
    </div>
  );
}
