import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("dev server proxies listing photos through /media", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(path.resolve(here, "../../vite.config.ts"), "utf8");
  expect(src).toMatch(/["']\/media["']/);
  expect(src).toMatch(/["']\/api["']/);
});
