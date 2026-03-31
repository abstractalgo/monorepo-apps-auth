# Monorepo with Google SSO Auth Gateway

## Context
Create a monorepo with two Vite + React + TypeScript apps, protected by Google SSO (restricted to a specific Google Workspace domain). Both apps deploy to separate Vercel projects. A third small "auth-gateway" app handles Google OAuth centrally, enabling SSO to work on both production and preview deployments without needing to register each preview URL in Google Cloud Console.

## Architecture Overview

```
monorepo-apps-auth/
├── apps/
│   ├── app-a/              # Vite + React + TS (placeholder app)
│   ├── app-b/              # Vite + React + TS (placeholder app)
│   └── auth-gateway/       # Small Vite + React app handling Google OAuth
├── packages/
│   ├── auth/               # Shared auth utilities (token validation, guards, hooks)
│   └── shared/             # Mock shared package (demo purposes)
├── turbo.json
├── package.json            # Root workspace config
├── .yarnrc.yml             # Yarn 4 Berry config
└── .gitignore
```

## Auth Flow

1. User visits `app-a` or `app-b` (production or preview)
2. `packages/auth` checks localStorage for a valid Google ID token
3. If no valid token → redirect to auth gateway: `https://auth-gateway.vercel.app/login?redirect=<origin-url>`
4. Auth gateway shows "Sign in with Google" button
5. User signs in via Google Identity Services
6. Gateway validates the `hd` (hosted domain) claim against the allowed org domain
7. Gateway redirects back: `<origin-url>#token=<id_token>`
8. The originating app picks up the token from the URL fragment, stores it in localStorage
9. `packages/auth` validates the token and renders the app

## Implementation Steps

### Step 1: Initialize monorepo scaffolding
- Yarn 4 Berry with `nodeLinker: node-modules`
- Turborepo for build orchestration
- Workspaces: `apps/*` and `packages/*`

### Step 2: Shared packages
- `@monorepo/shared` — mock utility package
- `@monorepo/auth` — AuthProvider, useAuth hook, RequireAuth guard, token validation

### Step 3: Auth gateway app
- Google Identity Services "Sign in with Google" button
- Redirect URL validation (prevent open redirects)
- Token handoff via URL fragment

### Step 4: Placeholder apps (app-a, app-b)
- Wrapped in AuthProvider + RequireAuth
- Simple authenticated home page with logout

### Step 5: Vercel + Google Cloud setup docs
- SETUP.md with deployment instructions

## Verification
1. `yarn install` resolves all workspaces
2. `yarn turbo build` builds everything
3. `yarn turbo dev` starts all 3 apps
4. Full auth flow works: app → gateway → Google → gateway → app
