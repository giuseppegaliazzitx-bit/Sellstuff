import type { MarketManager } from "../../shared/api/types";
import { CopyContact } from "./CopyContact";

export function ManagerContacts({
  manager,
  tone = "light",
}: {
  manager: MarketManager | null;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const name = manager?.name || "Market desk";
  const license = manager?.license || (manager ? "" : "No agent assigned");
  return (
    <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3" data-testid="deal-manager">
      <div className="flex min-w-0 flex-row items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${
            dark ? "bg-white/15 text-white" : "bg-chip text-header"
          }`}
        >
          {manager?.photo_url ? (
            <img src={manager.photo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <p className={`truncate text-sm font-semibold ${dark ? "text-white" : ""}`}>{name}</p>
          {license ? (
            <p className={`text-xs ${dark ? "text-white/70" : "text-neutral-500"}`}>{license}</p>
          ) : null}
        </div>
      </div>
      <div className={`flex flex-row items-center gap-1 ${dark ? "text-white" : "text-header"}`}>
        {manager?.phone ? (
          <CopyContact value={manager.phone} label="phone" className={dark ? "hover:bg-white/10" : "hover:bg-chip"}>
            <MsgIcon />
          </CopyContact>
        ) : null}
        {manager?.phone ? (
          <CopyContact value={manager.phone} label="phone" className={dark ? "hover:bg-white/10" : "hover:bg-chip"}>
            <PhoneIcon />
          </CopyContact>
        ) : null}
        {manager?.email ? (
          <CopyContact value={manager.email} label="email" className={dark ? "hover:bg-white/10" : "hover:bg-chip"}>
            <MailIcon />
          </CopyContact>
        ) : null}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function MsgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-2 12H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1m-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m4.5-4H7V4h9z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 4-8 5-8-5V6l8 5 8-5z" />
    </svg>
  );
}
