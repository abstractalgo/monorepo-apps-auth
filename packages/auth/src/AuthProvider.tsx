import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  type GoogleUser,
  clearToken,
  extractTokenFromHash,
  getToken,
  saveToken,
  parseToken,
} from "./token";

export interface AuthContextValue {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  gatewayUrl: string;
}

export function AuthProvider({ children, gatewayUrl }: AuthProviderProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    // Redirect to gateway for fresh login
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `${gatewayUrl}?redirect=${redirect}`;
  }, [gatewayUrl]);

  useEffect(() => {
    // Check for token in URL hash (returning from auth gateway)
    const hashToken = extractTokenFromHash();
    if (hashToken) {
      const validUser = parseToken(hashToken);
      if (validUser) {
        saveToken(hashToken);
        setUser(validUser);
        setIsLoading(false);
        return;
      }
    }

    // Check for existing token in localStorage
    const storedToken = getToken();
    if (storedToken) {
      const validUser = parseToken(storedToken);
      if (validUser) {
        setUser(validUser);
        setIsLoading(false);
        return;
      }
      // Token is expired or invalid
      clearToken();
    }

    // No valid token — redirect to auth gateway
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `${gatewayUrl}?redirect=${redirect}`;
  }, [gatewayUrl]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, logout }),
    [user, isLoading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
