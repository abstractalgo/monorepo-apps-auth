import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  type GoogleUser,
  clearToken,
  extractTokenFromHash,
  getToken,
  saveToken,
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

async function verifyTokenServerSide(
  gatewayUrl: string,
  credential: string
): Promise<GoogleUser | null> {
  try {
    const res = await fetch(`${gatewayUrl}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

function redirectToLogin(gatewayUrl: string) {
  const redirect = encodeURIComponent(window.location.origin);
  window.location.href = `${gatewayUrl}?redirect=${redirect}`;
}

export function AuthProvider({ children, gatewayUrl }: AuthProviderProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    redirectToLogin(gatewayUrl);
  }, [gatewayUrl]);

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      // Check for token in URL hash (returning from auth gateway)
      const hashToken = extractTokenFromHash();
      if (hashToken) {
        const verifiedUser = await verifyTokenServerSide(gatewayUrl, hashToken);
        if (cancelled) return;
        if (verifiedUser) {
          saveToken(hashToken);
          setUser(verifiedUser);
          setIsLoading(false);
          return;
        }
      }

      // Check for existing token in localStorage
      const storedToken = getToken();
      if (storedToken) {
        const verifiedUser = await verifyTokenServerSide(gatewayUrl, storedToken);
        if (cancelled) return;
        if (verifiedUser) {
          setUser(verifiedUser);
          setIsLoading(false);
          return;
        }
        // Token is expired or invalid
        clearToken();
      }

      // No valid token — redirect to auth gateway
      if (!cancelled) {
        redirectToLogin(gatewayUrl);
      }
    }

    authenticate();
    return () => { cancelled = true; };
  }, [gatewayUrl]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, logout }),
    [user, isLoading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
