import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth, pathAfterLogin } from "../../shared/auth";
import { ApiError } from "../../shared/api/client";

export function LoginPage() {
  const cfg = useConfig();
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const user = await auth.login(
        String(form.get("email")),
        String(form.get("password")),
        needTotp ? String(form.get("totp") || "") : undefined,
      );
      navigate(pathAfterLogin(user), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "totp_required") {
        setNeedTotp(true);
        setError("Enter the code from your authenticator app.");
      } else if (err instanceof ApiError && err.code === "totp_invalid") {
        setError("Invalid authenticator or recovery code.");
      } else {
        setError(err instanceof ApiError ? "Invalid email or password" : "Could not sign in");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Log in</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {cfg.brand_name}
          {cfg.tagline ? ` — ${cfg.tagline}` : ""}. Inventory is private.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </label>
        {needTotp ? (
          <label className="text-sm font-medium">
            Authenticator code
            <input
              type="text"
              name="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-hover disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
        <p className="text-center text-xs text-neutral-500">
          <Link to="/forgot" className="text-gold hover:text-gold-hover">
            Forgot password
          </Link>
        </p>
      </form>
      <p className="text-center text-sm text-neutral-600">
        No account?{" "}
        <Link to="/register" className="text-gold hover:text-gold-hover">
          Register
        </Link>
      </p>
    </div>
  );
}
