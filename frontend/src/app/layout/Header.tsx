import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";
import { apiJson } from "../../shared/api/client";

export function Header() {
  const cfg = useConfig();
  const { user, logout, refreshUser } = useAuth();
  const [unread, setUnread] = useState(0);
  const preview = Boolean(user?.preview_as_client);
  const showAdmin = user?.role === "admin" && !preview;
  const home = !user ? "/" : user.status === "pending" ? "/waiting" : "/app/browse";

  useEffect(() => {
    if (!user || user.status !== "active") return;
    apiJson<{ read: boolean }[]>("/api/v1/me/notifications")
      .then((rows) => setUnread(rows.filter((n) => !n.read).length))
      .catch(() => undefined);
  }, [user]);
  return (
    <header className="bg-header text-white">
      {preview ? (
        <div className="bg-gold px-4 py-1 text-center text-xs text-white">
          Viewing as a buyer — rehab, lockbox, and the desk are hidden.{" "}
          <button
            type="button"
            className="underline"
            onClick={async () => {
              await apiJson("/api/v1/auth/preview-as-client", {
                method: "POST",
                body: JSON.stringify({ enabled: false }),
              });
              await refreshUser();
            }}
          >
            Exit client view
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-14 max-w-6xl flex-row flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link to={home} className="flex items-center gap-2" aria-label={cfg.brand_name}>
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt={cfg.brand_name} className="h-7" />
          ) : (
            <span className="font-semibold tracking-wide text-gold">{cfg.brand_name}</span>
          )}
        </Link>
        <div className="flex flex-row flex-wrap items-center gap-3">
        {user ? (
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none text-sm text-neutral-200">Menu</summary>
            <div className="absolute right-0 z-20 mt-2 flex w-44 flex-col gap-2 rounded border border-neutral-700 bg-header p-3 text-sm shadow">
              {user.status === "active" ? <Link to="/app/browse">Browse</Link> : null}
              {showAdmin ? (
                <>
                  <Link to="/admin/deals">Inventory</Link>
                  <Link to="/admin/buyers">Buyers</Link>
                  <Link to="/admin/managers">Managers</Link>
                  <Link to="/admin/offers">Offers</Link>
                  <Link to="/admin/blasts">Blasts</Link>
                  <Link to="/admin/metrics">Metrics</Link>
                  <Link to="/admin/mail">Mail</Link>
                </>
              ) : null}
              {user.status === "active" ? (
                <>
                  <Link to="/app/saved">Saved</Link>
                  <Link to="/app/offers">Offers</Link>
                  <Link to="/app/ask">Ask us</Link>
                  <Link to="/app/notifications">Notifications</Link>
                  <Link to="/app/settings">Settings</Link>
                </>
              ) : null}
            </div>
          </details>
        ) : null}
        <nav className="hidden flex-row flex-wrap items-center gap-1 text-sm md:flex">
          {user && user.status === "active" ? <Tab to="/app/browse">Browse</Tab> : null}
          {showAdmin ? (
            <>
              <Tab to="/admin/deals">Inventory</Tab>
              <Tab to="/admin/buyers">Buyers</Tab>
              <Tab to="/admin/managers">Managers</Tab>
              <Tab to="/admin/offers" className="hidden sm:inline-flex">
                Offers
              </Tab>
              <Tab to="/admin/blasts" className="hidden sm:inline-flex">
                Blasts
              </Tab>
              <Tab to="/admin/metrics" className="hidden sm:inline-flex">
                Metrics
              </Tab>
              <Tab to="/admin/mail" className="hidden lg:inline-flex">
                Mail
              </Tab>
            </>
          ) : null}
          {user && user.status === "active" ? (
            <>
              <Tab to="/app/saved" className="hidden sm:inline-flex">
                Saved
              </Tab>
              {!showAdmin ? (
                <Tab to="/app/offers" className="hidden sm:inline-flex">
                  Offers
                </Tab>
              ) : null}
              <Tab to="/app/ask">Ask us</Tab>
              <Tab to="/app/notifications" className="relative">
                Bell
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1 text-[10px] text-white">
                    {unread}
                  </span>
                ) : null}
              </Tab>
              <Tab to="/app/settings">Settings</Tab>
            </>
          ) : null}
        </nav>
          {user ? (
            <button type="button" onClick={() => logout()} className="text-gold hover:text-gold-hover">
              Log out
            </button>
          ) : (
            <Link to="/login" className="text-gold hover:text-gold-hover">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Tab({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex items-center rounded px-2 py-1 ${
          isActive ? "bg-gold text-white" : "text-neutral-200 hover:text-white"
        } ${className}`
      }
    >
      {children}
    </NavLink>
  );
}
