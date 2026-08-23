import { createContext, useContext, type ReactNode } from "react";
import type { PublicConfig } from "./api/types";

const ConfigContext = createContext<PublicConfig | null>(null);

export function ConfigProvider({
  value,
  children,
}: {
  value: PublicConfig;
  children: ReactNode;
}) {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): PublicConfig {
  const cfg = useContext(ConfigContext);
  if (!cfg) {
    throw new Error("useConfig must be used inside ConfigProvider");
  }
  return cfg;
}
