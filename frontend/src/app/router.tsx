import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { GuestOnly, PendingOnly, RequireActive, RequireAdmin } from "./guards";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ForgotPage } from "../features/auth/ForgotPage";
import { ResetPage } from "../features/auth/ResetPage";
import { VerifyPage } from "../features/auth/VerifyPage";
import { WaitingRoom } from "../features/auth/WaitingRoom";
import { HomePage } from "../features/legal/HomePage";
import { BrowsePage } from "../features/browse/BrowsePage";
import { DealPage } from "../features/deal/DealPage";
import { BuyersPage } from "../features/admin/BuyersPage";
import { AdminDealsPage } from "../features/admin/DealsPage";
import { MetricsPage } from "../features/admin/MetricsPage";
import { BlastsPage } from "../features/admin/BlastsPage";
import { PipelinePage } from "../features/admin/PipelinePage";
import { MailboxPage } from "../features/admin/MailboxPage";
import { DealEditorPage } from "../features/admin/DealEditorPage";
import { BuyerDetailPage } from "../features/admin/BuyerDetailPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { SavedPage } from "../features/settings/SavedPage";
import { MyOffersPage } from "../features/settings/OffersPage";
import { NotificationsPage } from "../features/settings/NotificationsPage";
import { ChatPage } from "../features/chat/ChatPage";
import { LegalPage } from "../features/legal/LegalPages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "privacy", element: <LegalPage kind="privacy" /> },
      { path: "terms", element: <LegalPage kind="terms" /> },
      { path: "disclosures", element: <LegalPage kind="disclosures" /> },
      { path: "verify", element: <VerifyPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot", element: <ForgotPage /> },
          { path: "reset", element: <ResetPage /> },
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
          { path: "app/settings", element: <SettingsPage /> },
          { path: "app/saved", element: <SavedPage /> },
          { path: "app/offers", element: <MyOffersPage /> },
          { path: "app/notifications", element: <NotificationsPage /> },
          { path: "app/chat", element: <ChatPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: "admin/buyers", element: <BuyersPage /> },
          { path: "admin/buyers/:id", element: <BuyerDetailPage /> },
          { path: "admin/deals", element: <AdminDealsPage /> },
          { path: "admin/deals/:id", element: <DealEditorPage /> },
          { path: "admin/metrics", element: <MetricsPage /> },
          { path: "admin/blasts", element: <BlastsPage /> },
          { path: "admin/offers", element: <PipelinePage /> },
          { path: "admin/mail", element: <MailboxPage /> },
        ],
      },
    ],
  },
]);
