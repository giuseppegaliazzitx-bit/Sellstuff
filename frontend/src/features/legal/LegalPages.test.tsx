import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { LegalPage } from "./LegalPages";
import type { PublicConfig } from "../../shared/api/types";
import type { LegalKind } from "./LegalPages";

const cfg: PublicConfig = {
  brand_name: "Prairie Desk",
  tagline: null,
  domain: "localhost",
  support_phone: null,
  support_email: "desk@localhost",
  logo_url: null,
  footer_legal_name: null,
  primary_state: "TX",
  mailing_address: "123 Main St, Dallas, TX 75201",
  terms_version: "2026-08-22",
};

function renderKind(kind: LegalKind) {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <LegalPage kind={kind} />
      </MemoryRouter>
    </ConfigProvider>,
  );
}

test("privacy policy is the full desk policy under our brand", () => {
  renderKind("privacy");
  expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
  expect(screen.getByText(/Last modified: August 27, 2026/)).toBeInTheDocument();
  expect(screen.getAllByText(/Prairie Desk/).length).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "Privacy Policy for California Residents" })).toHaveAttribute(
    "href",
    "/privacy-ca",
  );
  expect(screen.getByRole("link", { name: "Do Not Sell My Personal Information" })).toHaveAttribute(
    "href",
    "/do-not-sell",
  );
  expect(screen.queryByText(/New Western/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/HomeGo/i)).not.toBeInTheDocument();
});

test("terms of use is the full desk terms under our brand", () => {
  renderKind("terms");
  expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();
  expect(screen.getByText(/Last Modified: August 27, 2026/)).toBeInTheDocument();
  expect(screen.getByText(/Version 2026-08-22/)).toBeInTheDocument();
  expect(screen.getByText(/Non-Circumvention/)).toBeInTheDocument();
  expect(screen.getAllByText(/State of/).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: "Privacy Policy" })[0]).toHaveAttribute("href", "/privacy");
  expect(screen.queryByText(/New Western/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/United InvestexUSA/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/TREC License #607371/)).not.toBeInTheDocument();
});

test("CA privacy policy covers CCPA rights and opt-out", () => {
  renderKind("privacy-ca");
  expect(screen.getByRole("heading", { name: "Privacy Policy for California Residents" })).toBeInTheDocument();
  expect(screen.getByText(/California Consumer Privacy Act/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Do Not Sell My Personal Information" })).toHaveAttribute(
    "href",
    "/do-not-sell",
  );
  expect(screen.queryByText(/New Western/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/866-782-3628/)).not.toBeInTheDocument();
});

test("do-not-sell page has a CCPA request form", () => {
  renderKind("do-not-sell");
  expect(screen.getByRole("heading", { name: "Do Not Sell My Personal Information" })).toBeInTheDocument();
  expect(screen.getByText(/does not sell your personal information/i)).toBeInTheDocument();
  expect(screen.getByTestId("ccpa-request-form")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Read Our Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: "Read Our Privacy Policy for California Residents" })).toHaveAttribute(
    "href",
    "/privacy-ca",
  );
});
