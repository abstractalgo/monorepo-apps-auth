import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

interface RequireAuthProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
}

export function RequireAuth({
  children,
  loadingFallback = <div>Authenticating...</div>,
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    // AuthProvider handles redirect — this is a fallback
    return null;
  }

  return <>{children}</>;
}
