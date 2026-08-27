import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DealEditorPage } from "./DealEditorPage";

vi.mock("../../shared/api/client", () => ({
  apiJson: async () => ({
    id: "1",
    address1: "916 Eldridge St",
    city: "Dallas",
    state: "TX",
    postal_code: "75201",
    list_price_cents: 6990000,
    arv_cents: 11000000,
    mao_cents: 800000,
    lockbox_code: "4321",
    beds: 3,
    baths: 2,
    sqft: 1400,
    year_built: 1954,
    occupancy: "vacant",
    description: "pitch",
    photos: [],
    video_url: null,
    rehab_high_cents: 2500000,
    days_on_market: 4,
    published_at: "2026-08-20T00:00:00Z",
  }),
  getCookie: () => "",
}));

test("admin editor fills listing fields and shows on-market days, not listing dates", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/deals/1"]}>
      <Routes>
        <Route path="/admin/deals/:id" element={<DealEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("916 Eldridge St")).toBeInTheDocument();
  expect(screen.getByTestId("desk-on-market").textContent).toMatch(/4 days on market/i);
  expect(screen.getByText(/listing \(what buyers see\)/i)).toBeInTheDocument();
  expect(screen.getByText(/desk only/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/list price/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/year built/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument();
  expect(document.querySelector("input[type='datetime-local']")).toBeNull();
});
