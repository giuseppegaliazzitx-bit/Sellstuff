import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, loginRequest, logoutRequest, registerRequest, ApiError } from "./api/client";
import type { AuthUser } from "./api/types";

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        return null;
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const me = await loginRequest(email, password);
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    setError(null);
    const me = await registerRequest(payload);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, error, login, register, logout, refreshUser }),
    [user, ready, error, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      ready: true,
      error: null,
      login: async () => {
        throw new Error("AuthProvider missing");
      },
      register: async () => {
        throw new Error("AuthProvider missing");
      },
      logout: async () => undefined,
      refreshUser: async () => null,
    };
  }
  return ctx;
}

export function pathAfterLogin(user: AuthUser): string {
  if (user.status === "pending") return "/waiting";
  if (user.role === "admin") return "/admin/buyers";
  return "/app/browse";
}
