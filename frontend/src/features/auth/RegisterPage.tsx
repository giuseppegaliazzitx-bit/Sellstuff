import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConfig } from "../../shared/config";
import { useAuth, pathAfterLogin } from "../../shared/auth";
import { ApiError } from "../../shared/api/client";

const ASSET_TYPES = ["SFR", "2-4", "land", "commercial"];

export function RegisterPage() {
  const cfg = useConfig();
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const asset_types = ASSET_TYPES.filter((t) => form.get(`asset_${t}`));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    try {
      await auth.register({
        email: String(form.get("email")),
        password,
        full_name: String(form.get("full_name")),
        phone: String(form.get("phone") || ""),
        company: String(form.get("company") || "") || null,
        markets: String(form.get("markets") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        max_purchase_price_cents: form.get("max_price")
          ? Math.round(Number(form.get("max_price")) * 100)
          : null,
        asset_types,
        terms_version: cfg.terms_version,
        sms_consent: Boolean(form.get("sms_consent")),
        lead_source: String(form.get("lead_source") || "website"),
      });
      const user = await auth.login(String(form.get("email")), password);
      navigate(pathAfterLogin(user), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Open registration for {cfg.brand_name}. New accounts wait for admin approval.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <label className="text-sm font-medium">
          Full name
          <input name="full_name" required className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">
          Email
          <input type="email" name="email" required className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">
          Password (12+ characters)
          <input
            type="password"
            name="password"
            required
            minLength={12}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input name="phone" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">
          Company (optional)
          <input name="company" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">
          Markets of interest (comma-separated)
          <input name="markets" placeholder="Dallas" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">
          Max purchase price (USD)
          <input type="number" name="max_price" min={0} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium">Asset types</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {ASSET_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="checkbox" name={`asset_${t}`} /> {t}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm font-medium">
          How did you hear about us?
          <select name="lead_source" className="mt-1 w-full rounded border px-3 py-2 text-sm">
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="facebook">Facebook</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="terms" required className="mt-1" />
          <span>
            I accept the confidentiality terms (no daisy-chaining, independent verification, no unaccompanied
            entry). Version {cfg.terms_version}.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="sms_consent" className="mt-1" />
          <span>I consent to SMS (optional; unchecked by default).</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-hover disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-gold hover:text-gold-hover">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
