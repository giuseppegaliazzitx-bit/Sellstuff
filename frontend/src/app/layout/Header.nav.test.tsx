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
      email: "b@x.com",
      name: "Buyer",
      role: "client",
      status: "active",
      email_verified: true,
      terms_accepted: true,
    },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
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

test("buyer header has no Offers tab and keeps brand + browse", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter initialEntries={["/app/browse"]}>
        <Header />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getByText("Prairie Desk")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Browse" }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
});
