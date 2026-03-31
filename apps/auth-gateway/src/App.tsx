import { useCallback, useEffect, useRef, useState } from "react";
import { isAllowedRedirect } from "./redirect";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

function getRedirectUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect");
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}

export function App() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const redirectUrl = getRedirectUrl();
  const allowedDomain = import.meta.env.VITE_ALLOWED_DOMAIN || "";
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      const token = response.credential;

      // Validate hosted domain
      if (allowedDomain) {
        try {
          const payload = decodeJwtPayload(token);
          if (payload.hd !== allowedDomain) {
            setError(
              `Access restricted to ${allowedDomain} accounts. You signed in with a ${payload.hd || "personal"} account.`
            );
            return;
          }
        } catch {
          setError("Failed to validate token.");
          return;
        }
      }

      // Redirect back with token
      if (redirectUrl && isAllowedRedirect(redirectUrl)) {
        window.location.href = `${redirectUrl}#token=${encodeURIComponent(token)}`;
      } else {
        setError("No valid redirect URL provided.");
      }
    },
    [redirectUrl, allowedDomain]
  );

  useEffect(() => {
    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID is not configured.");
      return;
    }

    if (!redirectUrl) {
      setError("No redirect URL provided. This page should be accessed from an app.");
      return;
    }

    if (!isAllowedRedirect(redirectUrl)) {
      setError("The redirect URL is not in the allowed list.");
      return;
    }

    const initGoogle = () => {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 300,
      });
    };

    // GSI script may not be loaded yet
    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [clientId, redirectUrl, handleCredentialResponse]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        gap: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Sign In</h1>
      {allowedDomain && (
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Restricted to <strong>@{allowedDomain}</strong> accounts
        </p>
      )}
      {error ? (
        <p style={{ color: "#dc2626", maxWidth: 400, textAlign: "center" }}>{error}</p>
      ) : (
        <div ref={buttonRef} />
      )}
    </div>
  );
}
