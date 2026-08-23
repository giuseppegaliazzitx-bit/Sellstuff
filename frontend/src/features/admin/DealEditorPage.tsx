import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiJson, getCookie } from "../../shared/api/client";
import { formatUsd } from "../../shared/money";
import type { DealAdmin } from "../../shared/api/types";

export function DealEditorPage() {
  const { id } = useParams();
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin/deals" className="text-sm text-gold">
        Back to inventory
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{deal.address1}</h1>
      <p className="text-sm text-neutral-500">
        {formatUsd(deal.list_price_cents)} · ARV {formatUsd(deal.arv_cents)} · MAO {formatUsd(deal.mao_cents)} ·
        lockbox {deal.lockbox_code || "—"}
      </p>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}
      <form
        className="mt-6 grid grid-cols-2 gap-2 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const due = String(fd.get("due") || "");
          const early = String(fd.get("early") || "");
          const updated = await apiJson<DealAdmin>(`/api/v1/admin/deals/${deal.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              list_price_cents: Math.round(Number(fd.get("price")) * 100),
              description: String(fd.get("description")),
              lockbox_code: String(fd.get("lockbox")),
              occupancy: String(fd.get("occupancy")),
              video_url: String(fd.get("video") || "") || null,
              ...(due ? { offers_due_at: new Date(due).toISOString() } : {}),
              ...(early ? { early_access_until: new Date(early).toISOString() } : {}),
            }),
          });
          setDeal(updated);
          setMsg("Saved");
        }}
      >
        <input name="price" type="number" defaultValue={deal.list_price_cents / 100} className="rounded border px-2 py-1" />
        <input name="lockbox" defaultValue={deal.lockbox_code} placeholder="Lockbox" className="rounded border px-2 py-1" />
        <input name="occupancy" defaultValue={deal.occupancy} className="rounded border px-2 py-1" />
        <input name="video" defaultValue={deal.video_url || ""} placeholder="YouTube / Vimeo / Matterport URL" className="rounded border px-2 py-1" />
        <input name="due" type="datetime-local" className="rounded border px-2 py-1" />
        <input name="early" type="datetime-local" className="rounded border px-2 py-1" />
        <textarea name="description" defaultValue={deal.description} className="col-span-2 rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Save desk fields
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
          Add PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              await fetch(`/api/v1/admin/deals/${deal.id}/documents`, {
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
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {deal.photos.map((src) => (
          <img key={src} src={src} alt="" className="h-28 w-full rounded object-cover" />
        ))}
      </div>
      <form
        className="mt-8 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const start = String(fd.get("start"));
          const end = String(fd.get("end"));
          await apiJson(`/api/v1/admin/deals/${deal.id}/showing-windows`, {
            method: "POST",
            body: JSON.stringify({
              starts_at: new Date(start).toISOString(),
              ends_at: new Date(end).toISOString(),
              capacity: Number(fd.get("cap") || 6),
              notes: String(fd.get("notes") || "meet at the curb"),
            }),
          });
          setMsg("Showing window created");
        }}
      >
        <p className="font-medium">Group showing window</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input name="start" type="datetime-local" required className="rounded border px-2 py-1" />
          <input name="end" type="datetime-local" required className="rounded border px-2 py-1" />
          <input name="cap" type="number" defaultValue={6} className="rounded border px-2 py-1" />
          <input name="notes" placeholder="Notes" className="rounded border px-2 py-1" />
        </div>
        <button type="submit" className="mt-2 rounded bg-header px-3 py-1 text-white">
          Create window
        </button>
      </form>
    </div>
  );
}
