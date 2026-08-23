import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { useConfig } from "../../shared/config";
import { useAuth } from "../../shared/auth";
import { apiJson } from "../../shared/api/client";

export function AppShell() {
  const cfg = useConfig();
  const { user, refreshUser } = useAuth();
  const legal = cfg.footer_legal_name || cfg.brand_name;
  const needTerms = Boolean(user && user.terms_accepted === false);

  async function acceptTerms() {
    await apiJson("/api/v1/auth/accept-terms", {
      method: "POST",
      body: JSON.stringify({ terms_version: cfg.terms_version }),
    });
    await refreshUser();
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      {needTerms ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Updated terms</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {cfg.brand_name} updated its terms to version {cfg.terms_version}. Please accept to continue.
            </p>
            <button
              type="button"
              onClick={() => acceptTerms()}
              className="mt-4 rounded bg-gold px-4 py-2 text-sm font-semibold text-white"
            >
              Accept
            </button>
          </div>
        </div>
      ) : null}
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} {legal}. Off-market inventory. Login required.
      </footer>
    </div>
  );
}
