import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { AppShell } from "./AppShell";
import type { PublicConfig } from "../../shared/api/types";

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

test("footer links privacy, terms, CA privacy, and do not sell", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  expect(screen.queryByRole("link", { name: "Disclosure" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Privacy Policy for CA Residents" })).toHaveAttribute(
    "href",
    "/privacy-ca",
  );
  expect(screen.getByRole("link", { name: "Do Not Sell My Personal Information" })).toHaveAttribute(
    "href",
    "/do-not-sell",
  );
});
