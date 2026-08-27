import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CopyContact, resetCopyToasts } from "./CopyContact";

beforeEach(() => {
  resetCopyToasts();
});

test("clicking a contact icon copies and shows the value without Copied", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(
    <CopyContact value="2145550100" label="phone">
      phone
    </CopyContact>,
  );
  fireEvent.click(screen.getByRole("button", { name: /copy phone/i }));
  const status = await screen.findByRole("status");
  expect(status).toHaveTextContent("2145550100");
  expect(status).not.toHaveTextContent(/copied/i);
  expect(writeText).toHaveBeenCalledWith("2145550100");
});

test("only one copy toast is visible at a time", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(
    <div>
      <CopyContact value="2145550100" label="phone">
        phone
      </CopyContact>
      <CopyContact value="a@x.com" label="email">
        email
      </CopyContact>
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: /copy phone/i }));
  expect(await screen.findByRole("status")).toHaveTextContent("2145550100");
  fireEvent.click(screen.getByRole("button", { name: /copy email/i }));
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("a@x.com");
  });
  expect(screen.getAllByRole("status")).toHaveLength(1);
});
