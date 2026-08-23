import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DealCard } from "./DealCard";
import type { DealPublic } from "../../shared/api/types";

const deal: DealPublic = {
  id: "1",
  market_id: "m",
  market_name: "Dallas",
  market_timezone: "America/Chicago",
  status: "available",
  list_price_cents: 6990000,
  arv_cents: 11000000,
  address1: "916 Eldridge St",
  city: "Dallas",
  state: "TX",
  postal_code: "75201",
  lat: 32.7,
  lng: -96.8,
  beds: 3,
  baths: 2,
  sqft: 1400,
  year_built: 1954,
  occupancy: "vacant",
  access: "lockbox",
  property_type: "SFR",
  description: "pitch",
  offers_due_at: "2026-09-01T00:00:00Z",
  video_url: null,
  photos: [],
  cover_photo: null,
  price_history: [{ old_cents: 7490000, new_cents: 6990000, at: "2026-08-20T00:00:00Z" }],
  reduced_cents: 500000,
  saved: false,
};

test("card shows price and chips, never ARV or rehab", () => {
  const { container } = render(
    <MemoryRouter>
      <DealCard deal={deal} />
    </MemoryRouter>,
  );
  expect(screen.getByTestId("card-price").textContent).toContain("$69,900.00");
  expect(screen.getByText(/916 Eldridge/)).toBeInTheDocument();
  expect(screen.getByText("Reduced")).toBeInTheDocument();
  expect(screen.getByText("Offers due")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/ARV/i);
  expect(container.textContent).not.toMatch(/rehab/i);
  expect(container.textContent).not.toMatch(/assignment/i);
});
