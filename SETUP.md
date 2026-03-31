# Setup Guide

## Prerequisites

- Node.js 24+ (via nvm: `nvm use`)
- Yarn 4 (included in repo via `.yarn/releases`)

## Local Development

```bash
# Install dependencies
yarn install

# Copy env files
cp apps/auth-gateway/.env.example apps/auth-gateway/.env.local
cp apps/app-a/.env.example apps/app-a/.env.local
cp apps/app-b/.env.example apps/app-b/.env.local

# Edit .env.local files with your Google OAuth Client ID and domain

# Start all apps
yarn turbo dev
```

Ports:
- Auth Gateway: http://localhost:3000
- App A: http://localhost:3001
- App B: http://localhost:3002

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (local dev)
   - `https://your-auth-gateway.vercel.app` (production)
7. Save and copy the **Client ID**

Only the auth gateway origin needs to be registered — the other apps redirect to the gateway for authentication.

## Vercel Deployment

Each app is deployed as a separate Vercel project. All three projects point to the same Git repo but with different root directories.

### Create 3 Vercel Projects

For each app (`auth-gateway`, `app-a`, `app-b`):

1. Import the repo in Vercel
2. Set **Root Directory** to `apps/<app-name>`
3. Framework Preset: **Vite**
4. Set environment variables (see `.env.example` in each app)

### Environment Variables per Project

**auth-gateway:**
| Variable | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `VITE_ALLOWED_DOMAIN` | e.g. `yourcompany.com` |
| `VITE_ALLOWED_REDIRECT_PATTERNS` | (optional) Extra redirect URL patterns |

**app-a and app-b:**
| Variable | Value |
|---|---|
| `VITE_AUTH_GATEWAY_URL` | e.g. `https://your-auth-gateway.vercel.app` |
| `VITE_ALLOWED_DOMAIN` | e.g. `yourcompany.com` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

### Update Google OAuth origins

After deploying the auth gateway, add its production URL to the **Authorized JavaScript origins** in Google Cloud Console.

## Auth Flow

1. User visits App A or App B
2. If no valid token in localStorage → redirects to auth gateway
3. Auth gateway shows "Sign in with Google"
4. After sign-in, validates the `hd` (hosted domain) claim
5. Redirects back to the app with the token in the URL fragment
6. App stores token in localStorage and shows authenticated content

## Preview Builds

Preview deployments get unique URLs that aren't registered in Google Cloud Console. The auth gateway's redirect validation allows any `*.vercel.app` origin by default, so preview builds of app-a/app-b will redirect to the **production** auth gateway for sign-in.

For the auth gateway itself, preview builds won't have a registered Google OAuth origin. Use Vercel's built-in Deployment Protection for auth gateway previews.
