import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { useConfig } from "../../shared/config";

export function AppShell() {
  const cfg = useConfig();
  const legal = cfg.footer_legal_name || cfg.brand_name;
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} {legal}. Off-market inventory. Login required.
      </footer>
    </div>
  );
}
