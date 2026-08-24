import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ConfigProvider } from "../../shared/config";
import { DealModal } from "./DealModal";

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u", role: "client", status: "active" } }),
}));

vi.mock("../../shared/api/client", () => ({
  apiJson: async (path: string) => {
    if (path.includes("/deals/") && !path.includes("documents") && !path.includes("showing") && !path.includes("contact")) {
      return {
        id: "1",
        address1: "916 Eldridge St",
        city: "Dallas",
        list_price_cents: 6990000,
        arv_cents: 11000000,
        beds: 3,
        baths: 2,
        sqft: 1400,
        year_built: 1954,
        occupancy: "vacant",
        photos: [],
        description: "pitch",
        reduced_cents: null,
        saved: false,
        video_url: null,
        lat: null,
        lng: null,
      };
    }
    return [];
  },
}));

test("property overlay dims the background and can close", async () => {
  const onClose = vi.fn();
  render(
    <ConfigProvider
      value={{
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
      }}
    >
      <MemoryRouter>
        <DealModal dealId="1" onClose={onClose} />
      </MemoryRouter>
    </ConfigProvider>,
  );
  const dialog = await screen.findByTestId("deal-modal");
  expect(dialog).toBeInTheDocument();
  expect(await screen.findByText(/916 Eldridge/)).toBeInTheDocument();
  fireEvent.click(dialog);
  expect(onClose).toHaveBeenCalled();
});
