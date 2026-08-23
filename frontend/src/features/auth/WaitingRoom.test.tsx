import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { WaitingRoom } from "./WaitingRoom";
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

test("waiting room tells the buyer they are pending", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <WaitingRoom />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getByText(/on the list/i)).toBeInTheDocument();
  expect(screen.getByText(/Prairie Desk/)).toBeInTheDocument();
});
