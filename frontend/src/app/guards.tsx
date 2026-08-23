import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../shared/auth";

export function GuestOnly() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="p-8 text-center text-sm text-neutral-500">Loading…</p>;
  if (user) {
    if (user.status === "pending") return <Navigate to="/waiting" replace />;
    const next = new URLSearchParams(location.search).get("next");
    if (next) return <Navigate to={next} replace />;
    if (user.role === "admin") return <Navigate to="/admin/buyers" replace />;
    return <Navigate to="/app/browse" replace />;
  }
  return <Outlet />;
}

export function PendingOnly() {
  const { user, ready } = useAuth();
  if (!ready) return <p className="p-8 text-center text-sm text-neutral-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "pending") {
    return <Navigate to={user.role === "admin" ? "/admin/buyers" : "/app/browse"} replace />;
  }
  return <Outlet />;
}

export function RequireActive() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="p-8 text-center text-sm text-neutral-500">Loading…</p>;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (user.status === "pending") return <Navigate to="/waiting" replace />;
  if (user.status !== "active") return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="p-8 text-center text-sm text-neutral-500">Loading…</p>;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">403</h1>
        <p className="mt-2 text-sm text-neutral-600">You do not have access to the desk.</p>
      </div>
    );
  }
  if (user.totp_required) {
    return <Navigate to="/app/settings?tab=2fa" replace />;
  }
  return <Outlet />;
}
