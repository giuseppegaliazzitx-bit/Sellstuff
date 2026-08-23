import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { LoginPage } from "./LoginPage";
import type { PublicConfig } from "../../shared/api/types";

const cfg: PublicConfig = {
  brand_name: "Prairie Desk",
  tagline: "Off-market deals",
  domain: "localhost",
  support_phone: null,
  support_email: null,
  logo_url: null,
  footer_legal_name: null,
  primary_state: "TX",
  mailing_address: null,
};

test("login page shows brand from config", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getByText(/Prairie Desk/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
});
