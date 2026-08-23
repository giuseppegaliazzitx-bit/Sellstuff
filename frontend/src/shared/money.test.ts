import { formatUsd, priceLabel } from "./money";

test("formats integer cents as dollars", () => {
  expect(formatUsd(1234567)).toBe("$12,345.67");
});

test("price label rounds to thousands", () => {
  expect(priceLabel(6990000)).toBe("$70K");
});
