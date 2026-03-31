const STORAGE_KEY = "monorepo_auth_token";

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  hd?: string; // hosted domain
}

/**
 * Decode JWT payload to read claims.
 *
 * NOTE: This does NOT verify the signature. Cryptographic verification
 * happens server-side in the auth gateway's /api/verify endpoint using
 * google-auth-library. By the time the token reaches a consuming app,
 * it has already been verified. This function only reads claims for
 * display and checks expiry.
 */
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

export function parseToken(token: string): GoogleUser | null {
  try {
    const payload = decodeJwtPayload(token);

    // Check expiry
    const exp = payload.exp as number;
    if (Date.now() >= exp * 1000) {
      return null;
    }

    return {
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
      hd: payload.hd as string | undefined,
    };
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function extractTokenFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");

  if (token) {
    // Clean the hash from the URL
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  return token;
}
