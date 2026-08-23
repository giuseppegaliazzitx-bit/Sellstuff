import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

export function Header() {
  const cfg = useConfig();
  return (
    <header className="bg-header text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/login" className="flex items-center gap-2" aria-label={cfg.brand_name}>
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt={cfg.brand_name} className="h-7" />
          ) : (
            <span className="font-semibold tracking-wide text-gold">{cfg.brand_name}</span>
          )}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <span className="hidden text-neutral-400 sm:inline">Browse</span>
          <Link to="/login" className="text-gold hover:text-gold-hover">
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
