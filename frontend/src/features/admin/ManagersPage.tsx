import { useEffect, useState } from "react";
import { apiJson, getCookie } from "../../shared/api/client";
import type { MarketManager, MarketOut } from "../../shared/api/types";

export function ManagersPage() {
  const [rows, setRows] = useState<MarketManager[]>([]);
  const [markets, setMarkets] = useState<MarketOut[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<MarketManager[]>("/api/v1/admin/managers"));
    setMarkets(await apiJson<MarketOut[]>("/api/v1/markets"));
  }

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold">Market managers</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Edit each agent, tick the markets they cover, or delete the profile. Buyers see the assigned
        person when they switch Your Market.
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
        <ManagerFields markets={markets} />
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
              <ManagerFields markets={markets} manager={r} />
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
    market_ids: fd.getAll("markets").map(String),
  };
}

function ManagerFields({
  markets,
  manager,
}: {
  markets: MarketOut[];
  manager?: MarketManager;
}) {
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
      <fieldset className="flex flex-row flex-wrap gap-3">
        <legend className="text-xs text-neutral-500">Markets this agent covers</legend>
        {markets.map((m) => (
          <label key={m.id} className="flex flex-row items-center gap-1">
            <input
              type="checkbox"
              name="markets"
              value={m.id}
              defaultChecked={Boolean(manager?.market_ids.includes(m.id))}
            />{" "}
            {m.name}
          </label>
        ))}
        {markets.length === 0 ? <span className="text-xs text-neutral-400">No markets yet.</span> : null}
      </fieldset>
    </>
  );
}
