import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAdmin } from "./guards";
import { vi } from "vitest";

vi.mock("../shared/auth", () => ({
  useAuth: () => ({
    ready: true,
    user: { id: "1", email: "b@x.com", name: "B", role: "client", status: "active" },
  }),
}));

test("client hitting admin sees 403", () => {
  render(
    <MemoryRouter initialEntries={["/admin/buyers"]}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin/buyers" element={<div>desk</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("403")).toBeInTheDocument();
  expect(screen.queryByText("desk")).not.toBeInTheDocument();
});
