import { fireEvent, render, screen } from "@testing-library/react";
import { MarketSearch } from "./MarketSearch";
import type { MarketOut } from "../../shared/api/types";

const markets: MarketOut[] = [
  {
    id: "1",
    slug: "dallas-tx",
    name: "Dallas",
    city: "Dallas",
    state: "TX",
    center_lat: 32.7,
    center_lng: -96.8,
    zoom: 11,
    timezone: "America/Chicago",
  },
  {
    id: "2",
    slug: "houston-tx",
    name: "Houston",
    city: "Houston",
    state: "TX",
    center_lat: 29.7,
    center_lng: -95.3,
    zoom: 11,
    timezone: "America/Chicago",
  },
  {
    id: "3",
    slug: "miami-fl",
    name: "Miami",
    city: "Miami",
    state: "FL",
    center_lat: 25.7,
    center_lng: -80.1,
    zoom: 11,
    timezone: "America/New_York",
  },
];

test("search filters live markets by city and state", () => {
  const onChange = vi.fn();
  render(<MarketSearch markets={markets} value="dallas-tx" onChange={onChange} />);
  fireEvent.focus(screen.getByRole("combobox"));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "hou" } });
  expect(screen.getByRole("button", { name: /houston, tx/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /miami, fl/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /houston, tx/i }));
  expect(onChange).toHaveBeenCalledWith("houston-tx");
});
