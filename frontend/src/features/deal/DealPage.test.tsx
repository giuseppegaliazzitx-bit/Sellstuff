import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { DealPage } from "./DealPage";
import type { PublicConfig } from "../../shared/api/types";

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u", role: "client", status: "active" } }),
}));

vi.mock("../browse/BrowseMap", () => ({
  BrowseMap: () => <div data-testid="browse-map" />,
}));

vi.mock("../../shared/api/client", () => ({
  apiJson: async (path: string) => {
    if (path.includes("/deals/") && !path.includes("documents")) {
      return {
        id: "1",
        market_id: "m",
        address1: "916 Eldridge St",
        city: "Dallas",
        state: "TX",
        postal_code: "75201",
        list_price_cents: 6990000,
        arv_cents: 11000000,
        beds: 3,
        baths: 2,
        sqft: 1400,
        year_built: 1954,
        photos: [],
        description: "pitch",
        reduced_cents: null,
        saved: true,
        video_url: null,
        lat: null,
        lng: null,
        status: "available",
      };
    }
    return [];
  },
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

test("deal page back link returns to Saved when opened from the watchlist", async () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter initialEntries={[{ pathname: "/app/deals/1", state: { from: "/app/saved" } }]}>
        <Routes>
          <Route path="/app/deals/:id" element={<DealPage />} />
        </Routes>
      </MemoryRouter>
    </ConfigProvider>,
  );
  const back = await screen.findByRole("link", { name: /back to saved/i });
  expect(back).toHaveAttribute("href", "/app/saved");
});
