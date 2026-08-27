import { render, screen } from "@testing-library/react";
import { ManagerContacts } from "./ManagerContacts";

test("renders manager name, license, and copy contacts", () => {
  render(
    <ManagerContacts
      manager={{
        id: "1",
        name: "Maggie Owen",
        phone: "2145550100",
        email: "maggie@localhost",
        license: "TX 767801",
        photo_url: null,
        market_ids: [],
      }}
    />,
  );
  expect(screen.getByTestId("deal-manager")).toBeInTheDocument();
  expect(screen.getByText("Maggie Owen")).toBeInTheDocument();
  expect(screen.getByText("TX 767801")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /copy phone/i }).length).toBe(2);
  expect(screen.getByRole("button", { name: /copy email/i })).toBeInTheDocument();
});

test("renders a desk placeholder when no manager is assigned", () => {
  render(<ManagerContacts manager={null} />);
  expect(screen.getByTestId("deal-manager")).toBeInTheDocument();
  expect(screen.getByText("Market desk")).toBeInTheDocument();
  expect(screen.getByText("No agent assigned")).toBeInTheDocument();
});
