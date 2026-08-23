import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";

export function Header() {
  const cfg = useConfig();
  const { user, logout } = useAuth();
  const home = !user ? "/login" : user.status === "pending" ? "/waiting" : "/app/browse";
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
        <nav className="flex items-center gap-6 text-sm">
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
              <Link to="/admin/metrics" className="hidden text-neutral-200 hover:text-white sm:inline">
                Metrics
              </Link>
            </>
          ) : null}
          {user && user.status === "active" ? (
            <Link to="/app/chat" className="text-neutral-200 hover:text-white">
              Chat
            </Link>
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
