import { fireEvent, render, screen } from "@testing-library/react";
import { ConfigProvider } from "../../shared/config";
import { DealNotices } from "./DealNotices";

test("deal notices start closed, open on click, and have no acknowledge control", () => {
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
      <DealNotices />
    </ConfigProvider>,
  );
  expect(screen.getByText("Notices & Disclosures")).toBeInTheDocument();
  const header = screen.getByRole("button", { name: /you must verify all information independently/i });
  expect(header).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText(/buyer is required to conduct their own due diligence/i)).not.toBeInTheDocument();
  fireEvent.click(header);
  expect(header).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/buyer is required to conduct their own due diligence/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /i acknowledge/i })).not.toBeInTheDocument();
});
