import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { GuestOnly, PendingOnly, RequireActive, RequireAdmin } from "./guards";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ForgotPage } from "../features/auth/ForgotPage";
import { WaitingRoom } from "../features/auth/WaitingRoom";
import { BrowsePage } from "../features/browse/BrowsePage";
import { DealPage } from "../features/deal/DealPage";
import { BuyersPage } from "../features/admin/BuyersPage";
import { AdminDealsPage } from "../features/admin/DealsPage";
import { MetricsPage } from "../features/admin/MetricsPage";
import { BlastsPage } from "../features/admin/BlastsPage";
import { PipelinePage } from "../features/admin/PipelinePage";
import { SessionsPage } from "../features/settings/SessionsPage";
import { ChatPage } from "../features/chat/ChatPage";

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
          { path: "app/deals/:id", element: <DealPage /> },
          { path: "app/settings", element: <SessionsPage /> },
          { path: "app/chat", element: <ChatPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: "admin/buyers", element: <BuyersPage /> },
          { path: "admin/deals", element: <AdminDealsPage /> },
          { path: "admin/metrics", element: <MetricsPage /> },
          { path: "admin/blasts", element: <BlastsPage /> },
          { path: "admin/offers", element: <PipelinePage /> },
        ],
      },
    ],
  },
]);
