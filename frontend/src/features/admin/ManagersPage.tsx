import { useEffect, useMemo, useState } from "react";
import { apiJson, getCookie } from "../../shared/api/client";
import type { MarketManager, PlaceOut } from "../../shared/api/types";

export function ManagersPage() {
  const [rows, setRows] = useState<MarketManager[]>([]);
  const [cities, setCities] = useState<PlaceOut[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [managers, places] = await Promise.all([
      apiJson<MarketManager[]>("/api/v1/admin/managers"),
      apiJson<PlaceOut[]>("/api/v1/admin/places?limit=400"),
    ]);
    setRows(managers);
    setCities(places);
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold">Market managers</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Search any city and attach it to an agent. That city becomes a market (or reuses the existing
        one) so the agent stays assigned even when there are no live listings.
      </p>
      {msg ? <p className="mt-2 text-sm text-gold">{msg}</p> : null}
      <form
        className="mt-4 flex flex-col gap-2 rounded border bg-white p-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await apiJson("/api/v1/admin/managers", {
              method: "POST",
              body: JSON.stringify(formPayload(fd)),
            });
            setMsg("Profile added");
            (e.target as HTMLFormElement).reset();
            await load();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <p className="font-medium">New profile</p>
        <ManagerFields cities={cities} />
        <button type="submit" className="rounded bg-gold px-3 py-1 font-semibold text-white">
          Add profile
        </button>
      </form>
      <ul className="mt-6 flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.id}>
            <form
              className="flex flex-col gap-2 rounded border bg-white p-4 text-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await apiJson(`/api/v1/admin/managers/${r.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(formPayload(fd)),
                  });
                  setMsg(`Updated ${String(fd.get("name"))}`);
                  await load();
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              <div className="flex flex-row items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    r.name[0]
                  )}
                </div>
                <label className="text-xs text-gold">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      await fetch(`/api/v1/admin/managers/${r.id}/photo`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "X-CSRF-Token": getCookie("csrf") },
                        body: fd,
                      });
                      await load();
                    }}
                  />
                </label>
              </div>
              <ManagerFields cities={cities} manager={r} />
              <div className="flex flex-row flex-wrap gap-2">
                <button type="submit" className="rounded bg-header px-3 py-1 text-white">
                  Save changes
                </button>
                <button
                  type="button"
                  className="rounded px-3 py-1 text-red-700"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${r.name}? Markets will have no manager until you assign someone else.`)) {
                      return;
                    }
                    try {
                      await apiJson(`/api/v1/admin/managers/${r.id}`, { method: "DELETE" });
                      setMsg(`Deleted ${r.name}`);
                      await load();
                    } catch (err) {
                      setMsg(err instanceof Error ? err.message : "Delete failed");
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formPayload(fd: FormData) {
  return {
    name: String(fd.get("name")),
    phone: String(fd.get("phone") || ""),
    email: String(fd.get("email") || ""),
    license: String(fd.get("license") || ""),
    places: fd.getAll("places").map((raw) => {
      const [city, state] = String(raw).split("|");
      return { city, state };
    }),
  };
}

function ManagerFields({
  cities,
  manager,
}: {
  cities: PlaceOut[];
  manager?: MarketManager;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(
    () => new Set((manager?.places || []).map((p) => `${p.city}|${p.state}`)),
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cities.slice(0, 40);
    return cities.filter((p) => p.label.toLowerCase().includes(needle) || p.state.toLowerCase() === needle);
  }, [cities, q]);
  const labels = useMemo(() => new Map(cities.map((p) => [`${p.city}|${p.state}`, p.label])), [cities]);

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <input
        name="name"
        required
        defaultValue={manager?.name}
        placeholder="Full name"
        className="rounded border px-2 py-1"
      />
      <input
        name="phone"
        defaultValue={manager?.phone}
        placeholder="Phone / text"
        className="rounded border px-2 py-1"
      />
      <input
        name="email"
        type="email"
        defaultValue={manager?.email}
        placeholder="Email"
        className="rounded border px-2 py-1"
      />
      <input
        name="license"
        defaultValue={manager?.license}
        placeholder="License (e.g. TX 767801)"
        className="rounded border px-2 py-1"
      />
      {Array.from(picked).map((key) => (
        <input key={key} type="hidden" name="places" value={key} />
      ))}
      <fieldset>
        <legend className="text-xs text-neutral-500">Cities this agent covers</legend>
        {picked.size ? (
          <ul className="mt-1 flex flex-row flex-wrap gap-1">
            {Array.from(picked).map((key) => (
              <li key={key}>
                <button
                  type="button"
                  className="rounded-full bg-chip px-2 py-0.5 text-xs"
                  onClick={() => toggle(key)}
                >
                  {labels.get(key) || key} ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-neutral-400">None yet — search a city below.</p>
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Dallas, Houston, Miami…"
          className="mt-2 w-full rounded border px-2 py-1"
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded border bg-white p-2">
          {filtered.map((p) => {
            const key = `${p.city}|${p.state}`;
            const on = picked.has(key);
            return (
              <label key={key} className="flex flex-row items-center gap-2 py-0.5">
                <input type="checkbox" checked={on} onChange={() => toggle(key)} />
                {p.label}
              </label>
            );
          })}
          {filtered.length === 0 ? <p className="text-xs text-neutral-400">No cities match.</p> : null}
        </div>
      </fieldset>
    </>
  );
}
