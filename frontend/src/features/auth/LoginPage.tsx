import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

export function LoginPage() {
  const cfg = useConfig();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        <button
          type="submit"
          className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-hover"
        >
          Log in
        </button>
        <p className="text-center text-xs text-neutral-500">
          Sign-in wires up in Phase 1. Registration will be open — no invite code.
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
