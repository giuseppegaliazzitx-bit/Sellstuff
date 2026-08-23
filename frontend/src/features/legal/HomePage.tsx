import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";

export function HomePage() {
  const cfg = useConfig();
  const { user } = useAuth();
  const next = user
    ? user.status === "pending"
      ? "/waiting"
      : user.role === "admin"
        ? "/admin/buyers"
        : "/app/browse"
    : "/login";

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Private wholesale desk</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">{cfg.brand_name}</h1>
      <p className="mt-4 text-base text-neutral-600">
        {cfg.tagline || "Off-market inventory for approved buyers. No public MLS dump."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={next} className="rounded bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-hover">
          {user ? "Enter desk" : "Log in"}
        </Link>
        {!user ? (
          <Link to="/register" className="rounded border border-neutral-300 px-5 py-2 text-sm font-medium">
            Request access
          </Link>
        ) : null}
      </div>
      <p className="mt-10 text-xs text-neutral-500">
        {cfg.primary_state} equitable-interest disclosures apply.{" "}
        {cfg.mailing_address ? `Mailing: ${cfg.mailing_address}` : null}
      </p>
    </div>
  );
}
