import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "../../shared/config";
import { SavedPage } from "./SavedPage";
import type { PublicConfig } from "../../shared/api/types";

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u", role: "client", status: "active" } }),
}));

vi.mock("../browse/BrowseMap", () => ({
  BrowseMap: () => <div data-testid="browse-map" />,
}));

vi.mock("../../shared/api/client", () => ({
  apiJson: async (path: string) => {
    if (path === "/api/v1/me/saves") {
      return [
        {
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
          photos: ["/p1.jpg"],
          description: "pitch",
          reduced_cents: null,
          saved: true,
          cover_photo: null,
          offers_due_at: null,
          early_access: false,
        },
      ];
    }
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
        photos: ["/p1.jpg"],
        description: "pitch",
        reduced_cents: null,
        saved: true,
        video_url: null,
        lat: 32.7,
        lng: -96.8,
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

test("opening a saved deal returns to Saved, not Browse", async () => {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter initialEntries={["/app/saved"]}>
        <SavedPage />
      </MemoryRouter>
    </ConfigProvider>,
  );
  fireEvent.click(await screen.findByTestId("deal-card"));
  expect(await screen.findByRole("button", { name: /back to saved/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /back to browse/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /back to saved/i }));
  expect(screen.queryByTestId("deal-modal")).not.toBeInTheDocument();
  expect(screen.getByText("Watchlist")).toBeInTheDocument();
});
