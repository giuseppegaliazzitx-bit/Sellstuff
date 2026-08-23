import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { GuestOnly, PendingOnly, RequireActive, RequireAdmin } from "./guards";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ForgotPage } from "../features/auth/ForgotPage";
import { WaitingRoom } from "../features/auth/WaitingRoom";
import { BrowsePage } from "../features/browse/BrowsePage";
import { BuyersPage } from "../features/admin/BuyersPage";
import { SessionsPage } from "../features/settings/SessionsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot", element: <ForgotPage /> },
        ],
      },
      {
        element: <PendingOnly />,
        children: [{ path: "waiting", element: <WaitingRoom /> }],
      },
      {
        element: <RequireActive />,
        children: [
          { path: "app/browse", element: <BrowsePage /> },
          { path: "app/settings", element: <SessionsPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [{ path: "admin/buyers", element: <BuyersPage /> }],
      },
    ],
  },
]);
