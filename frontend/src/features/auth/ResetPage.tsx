import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../../shared/api/client";

export function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    try {
      await apiJson("/api/v1/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      navigate("/login", { replace: true });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Reset failed");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}
      {!token ? (
        <p className="mt-4 text-sm">Missing token. Use the link from your email.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            name="password"
            required
            minLength={12}
            placeholder="New password (12+)"
            className="rounded border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white">
            Update password
          </button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm text-gold">
        Back to log in
      </Link>
    </div>
  );
}
