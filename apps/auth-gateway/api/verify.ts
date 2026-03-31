import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { credential, redirect } = req.body;

  if (!credential || !redirect) {
    return res.status(400).json({ error: "Missing credential or redirect" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const allowedDomain = process.env.ALLOWED_DOMAIN || "";

  if (!clientId) {
    return res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check hosted domain restriction
    if (allowedDomain && payload.hd !== allowedDomain) {
      return res.status(403).json({
        error: `Access restricted to ${allowedDomain} accounts. You signed in with a ${payload.hd || "personal"} account.`,
      });
    }

    // Redirect back to the app with the verified token
    const redirectUrl = new URL(redirect);
    redirectUrl.hash = `token=${encodeURIComponent(credential)}`;
    return res.redirect(302, redirectUrl.toString());
  } catch (err) {
    return res.status(401).json({ error: "Token verification failed" });
  }
}
