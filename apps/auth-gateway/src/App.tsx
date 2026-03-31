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

export function App() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const redirectUrl = getRedirectUrl();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!redirectUrl || !isAllowedRedirect(redirectUrl)) {
        setError("No valid redirect URL provided.");
        return;
      }

      setVerifying(true);

      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: response.credential,
            redirect: redirectUrl,
          }),
          redirect: "manual",
        });

        if (res.type === "opaqueredirect" || res.status === 302) {
          // The serverless function returns a redirect — follow it
          const location = res.headers.get("Location");
          if (location) {
            window.location.href = location;
            return;
          }
        }

        // If we got a JSON error response
        const data = await res.json();
        setError(data.error || "Verification failed");
      } catch {
        setError("Failed to verify token. Please try again.");
      } finally {
        setVerifying(false);
      }
    },
    [redirectUrl]
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

  const allowedDomain = import.meta.env.VITE_ALLOWED_DOMAIN || "";

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
      ) : verifying ? (
        <p style={{ color: "#666" }}>Verifying...</p>
      ) : (
        <div ref={buttonRef} />
      )}
    </div>
  );
}
