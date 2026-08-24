import { copyText } from "./copy";

test("copyText writes trimmed value to clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  await expect(copyText("  214-555-0100  ")).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith("214-555-0100");
});

test("copyText returns false when clipboard is empty or throws", async () => {
  await expect(copyText("   ")).resolves.toBe(false);
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  await expect(copyText("hi@x.com")).resolves.toBe(false);
});
