import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../shared/api/client";

export function ForgotPage() {
  const [done, setDone] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    const res = await apiJson<{ ok: boolean; debug_token?: string }>("/api/v1/auth/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setDebug(res.debug_token || null);
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {done ? (
        <div className="mt-4 text-sm text-neutral-600">
          <p>If that email is in our system, a reset link is on the way (or logged in sandbox).</p>
          {debug ? (
            <p className="mt-3">
              Local sandbox token:{" "}
              <Link to={`/reset?token=${encodeURIComponent(debug)}`} className="text-gold">
                set a new password
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="Email"
            className="rounded border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white">
            Send reset
          </button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm text-gold">
        Back to log in
      </Link>
    </div>
  );
}
