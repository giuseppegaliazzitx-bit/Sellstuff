import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ConfigProvider } from "../../shared/config";
import { Header } from "./Header";
import type { PublicConfig } from "../../shared/api/types";

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({
    ready: true,
    user: {
      id: "1",
      email: "admin@localhost",
      name: "Admin",
      role: "admin",
      status: "active",
      email_verified: true,
      terms_accepted: true,
    },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("../../shared/api/client", () => ({
  apiJson: async () => [],
}));

const cfg: PublicConfig = {
  brand_name: "Prairie Desk",
  tagline: null,
  domain: "localhost",
  support_phone: null,
  support_email: null,
  logo_url: null,
  footer_legal_name: null,
  primary_state: "TX",
  mailing_address: null,
  terms_version: "2026-08-22",
};

test("admin chrome has inventory and no Saved watchlist", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter initialEntries={["/admin/deals"]}>
        <Header />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getAllByRole("link", { name: "Inventory" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: "Metrics" }).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole("link", { name: "Saved" })).toHaveLength(0);
});
