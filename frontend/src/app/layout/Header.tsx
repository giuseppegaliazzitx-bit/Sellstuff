import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";
import { apiJson } from "../../shared/api/client";

export function Header() {
  const cfg = useConfig();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const home = !user ? "/" : user.status === "pending" ? "/waiting" : "/app/browse";

  useEffect(() => {
    if (!user || user.status !== "active") return;
    apiJson<{ read: boolean }[]>("/api/v1/me/notifications")
      .then((rows) => setUnread(rows.filter((n) => !n.read).length))
      .catch(() => undefined);
  }, [user]);
  return (
    <header className="bg-header text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to={home} className="flex items-center gap-2" aria-label={cfg.brand_name}>
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt={cfg.brand_name} className="h-7" />
          ) : (
            <span className="font-semibold tracking-wide text-gold">{cfg.brand_name}</span>
          )}
        </Link>
        {user ? (
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none text-sm text-neutral-200">Menu</summary>
            <div className="absolute right-0 z-20 mt-2 flex w-44 flex-col gap-2 rounded border border-neutral-700 bg-header p-3 text-sm shadow">
              {user.status === "active" ? <Link to="/app/browse">Browse</Link> : null}
              {user.role === "admin" ? (
                <>
                  <Link to="/admin/deals">Inventory</Link>
                  <Link to="/admin/buyers">Buyers</Link>
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
                  <Link to="/app/chat">Chat</Link>
                  <Link to="/app/notifications">Notifications</Link>
                  <Link to="/app/settings">Settings</Link>
                </>
              ) : null}
            </div>
          </details>
        ) : null}
        <nav className="flex items-center gap-4 text-sm md:gap-6">
          {user && user.status === "active" ? (
            <Link to="/app/browse" className="text-neutral-200 hover:text-white">
              Browse
            </Link>
          ) : (
            <span className="hidden text-neutral-400 sm:inline">Browse</span>
          )}
          {user?.role === "admin" ? (
            <>
              <Link to="/admin/deals" className="text-neutral-200 hover:text-white">
                Inventory
              </Link>
              <Link to="/admin/buyers" className="text-neutral-200 hover:text-white">
                Buyers
              </Link>
              <Link to="/admin/offers" className="hidden text-neutral-200 hover:text-white sm:inline">
                Offers
              </Link>
              <Link to="/admin/blasts" className="hidden text-neutral-200 hover:text-white sm:inline">
                Blasts
              </Link>
              <Link to="/admin/metrics" className="hidden text-neutral-200 hover:text-white sm:inline">
                Metrics
              </Link>
              <Link to="/admin/mail" className="hidden text-neutral-200 hover:text-white lg:inline">
                Mail
              </Link>
            </>
          ) : null}
          {user && user.status === "active" ? (
            <>
              <Link to="/app/saved" className="hidden text-neutral-200 hover:text-white sm:inline">
                Saved
              </Link>
              <Link to="/app/offers" className="hidden text-neutral-200 hover:text-white sm:inline">
                Offers
              </Link>
              <Link to="/app/chat" className="text-neutral-200 hover:text-white">
                Chat
              </Link>
              <Link to="/app/notifications" className="relative text-neutral-200 hover:text-white">
                Bell
                {unread > 0 ? (
                  <span className="absolute -right-2 -top-1 rounded-full bg-gold px-1 text-[10px] text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </>
          ) : null}
          {user ? (
            <>
              {user.status === "active" ? (
                <Link to="/app/settings" className="text-neutral-200 hover:text-white">
                  Settings
                </Link>
              ) : null}
              <button type="button" onClick={() => logout()} className="text-gold hover:text-gold-hover">
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-gold hover:text-gold-hover">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
