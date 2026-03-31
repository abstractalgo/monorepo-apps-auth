import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const oauthClient = new OAuth2Client();

async function getDirectoryService() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL || "";

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/admin.directory.group.readonly"],
    clientOptions: {
      subject: adminEmail, // impersonate a Workspace admin
    },
  });

  return google.admin({ version: "directory_v1", auth });
}

async function getUserGroups(userEmail: string): Promise<string[]> {
  try {
    const service = await getDirectoryService();
    const res = await service.groups.list({ userKey: userEmail });
    return (res.data.groups || []).map((g) => g.email!);
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow consuming apps to call this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { credential, redirect, requiredGroups } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Missing credential" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const allowedDomain = process.env.ALLOWED_DOMAIN || "";

  if (!clientId) {
    return res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
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

    // Check Google Groups membership if required
    const groups: string[] = requiredGroups || [];
    let userGroups: string[] = [];

    if (groups.length > 0) {
      userGroups = await getUserGroups(payload.email!);
      const isMember = groups.some((g: string) => userGroups.includes(g));
      if (!isMember) {
        return res.status(403).json({
          error: `Access requires membership in one of: ${groups.join(", ")}`,
          userGroups,
        });
      }
    }

    const user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      hd: payload.hd,
      groups: userGroups,
    };

    // If redirect is provided, return redirect URL (login flow from gateway)
    // Otherwise, return user info (token verification from consuming apps)
    if (redirect) {
      const redirectUrl = new URL(redirect);
      redirectUrl.hash = `token=${encodeURIComponent(credential)}`;
      return res.status(200).json({ redirectUrl: redirectUrl.toString(), user });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Token verification failed" });
  }
}
