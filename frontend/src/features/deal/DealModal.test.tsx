import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ConfigProvider } from "../../shared/config";
import { DealModal } from "./DealModal";
import type { MarketManager, PublicConfig } from "../../shared/api/types";

vi.mock("../../shared/auth", () => ({
  useAuth: () => ({ user: { id: "u", role: "client", status: "active" } }),
}));

vi.mock("../browse/BrowseMap", () => ({
  BrowseMap: ({ pins, focus }: { pins: { id: string }[]; focus?: boolean }) => (
    <div data-testid="browse-map" data-focus={focus ? "1" : "0"} data-pins={pins.map((p) => p.id).join(",")}>
      {pins.map((p) => p.id).join(",")}
    </div>
  ),
}));

vi.mock("../../shared/api/client", () => ({
  apiJson: async (path: string) => {
    if (path.includes("/deals/") && !path.includes("documents") && !path.includes("showing") && !path.includes("contact")) {
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
        occupancy: "vacant",
        photos: ["/p1.jpg", "/p2.jpg", "/p3.jpg", "/p4.jpg", "/p5.jpg"],
        description: `pitch ${"x".repeat(300)}`,
        reduced_cents: null,
        saved: false,
        video_url: null,
        lat: 32.7767,
        lng: -96.797,
        status: "available",
      };
    }
    return [];
  },
}));

const manager: MarketManager = {
  id: "mgr",
  name: "Maggie Owen",
  phone: "2145550100",
  email: "maggie@localhost",
  license: "TX 767801",
  photo_url: null,
  market_ids: ["m"],
};

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

function renderModal(onClose = vi.fn()) {
  render(
    <ConfigProvider value={cfg}>
      <MemoryRouter>
        <DealModal dealId="1" onClose={onClose} manager={manager} />
      </MemoryRouter>
    </ConfigProvider>,
  );
  return onClose;
}

test("property overlay is a full deal page with sticky header and mosaic", async () => {
  renderModal();
  const dialog = await screen.findByTestId("deal-modal");
  expect(dialog).toBeInTheDocument();
  expect(await screen.findByTestId("deal-page-stack")).toBeInTheDocument();
  expect(screen.getByTestId("deal-header-app-bar")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /back to browse/i })).toBeInTheDocument();
  expect(screen.getByTestId("market-agent-card")).toBeInTheDocument();
  expect(screen.getByText("Maggie Owen")).toBeInTheDocument();
  expect(screen.getByText("TX 767801")).toBeInTheDocument();
  expect(screen.getByTestId("deal-price").textContent).toContain("$69,900.00");
  expect(screen.getByText("View more")).toBeInTheDocument();
  const tiles = screen.getAllByTestId("image-grid");
  expect(tiles.length).toBe(5);
  expect(screen.queryByText("Available")).not.toBeInTheDocument();
  expect(screen.getByText("YOU MUST VERIFY ALL INFORMATION INDEPENDENTLY")).toBeInTheDocument();
  expect(screen.getByText("NO UNACCOMPANIED ENTRY OF PROPERTY")).toBeInTheDocument();
  expect(screen.getByText("NON-REPRESENTATION")).toBeInTheDocument();
  expect(screen.getByText("RISK OF LOSS")).toBeInTheDocument();
  expect(screen.getByText("PRIVILEGED & CONFIDENTIAL INFORMATION")).toBeInTheDocument();
  expect(screen.getByText("COPYRIGHT MATERIAL")).toBeInTheDocument();
  expect(screen.getByTestId("deal-address").textContent).toContain("916 Eldridge St");
  expect(screen.getByTestId("deal-year-built")).toHaveTextContent("Built in 1954");
  expect(screen.getByTestId("deal-beds")).toHaveTextContent("3 Beds");
  expect(screen.getByTestId("deal-baths")).toHaveTextContent("2 Baths");
  expect(screen.getByTestId("deal-sqft")).toHaveTextContent("1,400 Sq. Ft.");
  expect(screen.getByTestId("deal-description")).toHaveTextContent(/pitch/);
  expect(screen.getByText("Show more")).toBeInTheDocument();
  expect(screen.getByText("Notices & Disclosures")).toBeInTheDocument();
  expect(dialog.textContent).not.toMatch(/RSVP/i);
  expect(dialog.textContent).not.toMatch(/on market/i);
  expect(dialog.textContent).not.toMatch(/published/i);
  expect(screen.queryByRole("button", { name: /i.?m interested/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/^offer$/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /submit offer/i })).not.toBeInTheDocument();
});

test("Back to Browse closes the overlay", async () => {
  const onClose = renderModal();
  await screen.findByTestId("deal-page-stack");
  fireEvent.click(screen.getByRole("button", { name: /back to browse/i }));
  expect(onClose).toHaveBeenCalled();
});

test("Escape closes the overlay when the lightbox is not open", async () => {
  const onClose = renderModal();
  await screen.findByTestId("deal-page-stack");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});

test("View more opens a lightbox", async () => {
  renderModal();
  await screen.findByText("View more");
  fireEvent.click(screen.getByText("View more"));
  expect(screen.getByTestId("photo-lightbox")).toBeInTheDocument();
  expect(screen.getByText("1 / 5")).toBeInTheDocument();
  expect(screen.getAllByTestId("photo-filmstrip-thumb")).toHaveLength(5);
});

test("deal overlay sits above the browse map and shows only the subject pin", async () => {
  renderModal();
  const dialog = await screen.findByTestId("deal-modal");
  expect(dialog.className).toMatch(/z-\[2000\]/);
  expect(dialog.className).toMatch(/bg-black\/50/);
  const map = await screen.findByTestId("deal-map");
  expect(map).toBeInTheDocument();
  const inner = screen.getByTestId("browse-map");
  expect(inner).toHaveAttribute("data-pins", "1");
  expect(inner).toHaveAttribute("data-focus", "1");
  expect(inner.textContent).toBe("1");
});

test("clicking the dimmed browse backdrop closes the overlay", async () => {
  const onClose = renderModal();
  const dialog = await screen.findByTestId("deal-modal");
  fireEvent.click(dialog);
  expect(onClose).toHaveBeenCalled();
});

test("clicking inside the listing panel does not close the overlay", async () => {
  const onClose = renderModal();
  const stack = await screen.findByTestId("deal-page-stack");
  fireEvent.click(stack);
  expect(onClose).not.toHaveBeenCalled();
});
