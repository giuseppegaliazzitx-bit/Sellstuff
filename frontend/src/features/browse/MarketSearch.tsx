import { useMemo, useState } from "react";
import type { MarketOut } from "../../shared/api/types";
import { marketLabel } from "../../shared/api/types";

export function MarketSearch({
  markets,
  value,
  onChange,
}: {
  markets: MarketOut[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const selected = markets.find((m) => m.slug === value) || markets[0];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return markets;
    return markets.filter((m) => {
      const label = marketLabel(m).toLowerCase();
      return label.includes(needle) || m.slug.includes(needle) || m.state.toLowerCase() === needle;
    });
  }, [markets, q]);

  return (
    <div className="relative flex min-w-[10rem] flex-1 flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-500" htmlFor="market-search">
        Your Market
      </label>
      <input
        id="market-search"
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="market-search-list"
        autoComplete="off"
        placeholder="Search city, state"
        value={open ? q : selected ? marketLabel(selected) : q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="rounded border px-2 py-2 text-sm font-normal normal-case text-neutral-900"
      />
      {open ? (
        <ul
          id="market-search-list"
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border bg-white shadow"
        >
          {filtered.map((m) => (
            <li key={m.id} role="option" aria-selected={m.slug === selected?.slug}>
              <button
                type="button"
                className={`flex w-full px-3 py-2 text-left text-sm ${
                  m.slug === selected?.slug ? "bg-chip" : "hover:bg-chip"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m.slug);
                  setQ("");
                  setOpen(false);
                }}
              >
                {marketLabel(m)}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-500">No live markets match.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
