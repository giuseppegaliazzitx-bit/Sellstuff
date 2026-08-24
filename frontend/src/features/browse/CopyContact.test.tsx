import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { CopyContact } from "./CopyContact";

test("clicking a contact icon copies and shows the value", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(
    <CopyContact value="2145550100" label="phone">
      phone
    </CopyContact>,
  );
  fireEvent.click(screen.getByRole("button", { name: /copy phone/i }));
  expect(await screen.findByRole("status")).toHaveTextContent("Copied 2145550100");
  expect(writeText).toHaveBeenCalledWith("2145550100");
});
