import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";
import type { BuyerRow } from "../../shared/api/types";

interface Note {
  id: string;
  body: string;
  created_at: string;
}

interface Activity {
  kind: string;
  name: string;
  deal_id: string | null;
  at: string;
}

export function BuyerDetailPage() {
  const { id } = useParams();
  const [buyer, setBuyer] = useState<BuyerRow | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  async function load() {
    if (!id) return;
    setBuyer(await apiJson<BuyerRow>(`/api/v1/admin/buyers/${id}`));
    setNotes(await apiJson<Note[]>(`/api/v1/admin/users/${id}/notes`));
    setActivity(await apiJson<Activity[]>(`/api/v1/admin/users/${id}/activity`));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [id]);

  if (!buyer) return <p className="p-8 text-sm">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/admin/buyers" className="text-sm text-gold">
        Back
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{buyer.name}</h1>
      <p className="text-sm text-neutral-600">
        {buyer.email} · {buyer.phone} · {buyer.status} · tier {buyer.tier || "C"}
      </p>
      <form
        className="mt-4 flex gap-2 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await apiJson(`/api/v1/admin/buyers/${buyer.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              tier: String(fd.get("tier")),
              do_not_contact: Boolean(fd.get("dnc")),
              funds_verified: Boolean(fd.get("pof")),
            }),
          });
          await load();
        }}
      >
        <select name="tier" defaultValue={buyer.tier || "C"} className="rounded border px-2 py-1">
          <option>A</option>
          <option>B</option>
          <option>C</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="dnc" defaultChecked={buyer.do_not_contact} /> DNC
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="pof" defaultChecked={buyer.funds_verified} /> POF
        </label>
        <button type="submit" className="rounded bg-gold px-3 py-1 text-white">
          Save
        </button>
      </form>
      <h2 className="mt-8 font-medium">Notes</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded border bg-white p-3">
            {n.body}
            <span className="mt-1 block text-xs text-neutral-400">{n.created_at}</span>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = String(new FormData(e.currentTarget).get("body") || "");
          await apiJson(`/api/v1/admin/users/${buyer.id}/notes`, {
            method: "POST",
            body: JSON.stringify({ body }),
          });
          (e.currentTarget.elements.namedItem("body") as HTMLInputElement).value = "";
          await load();
        }}
      >
        <input name="body" required placeholder="Add a CRM note" className="flex-1 rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-header px-3 py-1 text-sm text-white">
          Add
        </button>
      </form>
      <h2 className="mt-8 font-medium">Activity</h2>
      <ul className="mt-2 space-y-1 text-xs text-neutral-600">
        {activity.map((a, i) => (
          <li key={`${a.at}-${i}`}>
            {new Date(a.at).toLocaleString()} · {a.kind} · {a.name}
            {a.deal_id ? ` · deal ${a.deal_id.slice(0, 8)}` : ""}
          </li>
        ))}
        {activity.length === 0 ? <li>No events yet.</li> : null}
      </ul>
    </div>
  );
}
