import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchPublicConfig } from "./shared/api/client";
import type { PublicConfig } from "./shared/api/types";
import { ConfigProvider } from "./shared/config";
import { router } from "./app/router";
import "./styles/index.css";

const queryClient = new QueryClient();

function Boot() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicConfig()
      .then((cfg) => {
        setConfig(cfg);
        document.title = cfg.brand_name;
      })
      .catch(() => {
        setError("API unreachable. Start the backend (python scripts/run_dev.py).");
      });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <p className="max-w-md text-center text-sm text-neutral-700">{error}</p>
      </div>
    );
  }
  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-neutral-500">
        Loading…
      </div>
    );
  }
  return (
    <ConfigProvider value={config}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Boot />
    </QueryClientProvider>
  </StrictMode>,
);
