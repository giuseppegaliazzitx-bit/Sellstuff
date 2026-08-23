import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { Header } from "./Header";
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
};

test("header wordmark is the runtime brand", () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </ConfigProvider>,
  );
  expect(screen.getByText("Prairie Desk")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
});
