import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

export function RegisterPage() {
  const cfg = useConfig();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Open registration for {cfg.brand_name} lands in Phase 1. New accounts start pending
        until an admin approves.
      </p>
      <Link to="/login" className="mt-6 inline-block text-sm text-gold hover:text-gold-hover">
        Back to log in
      </Link>
    </div>
  );
}
