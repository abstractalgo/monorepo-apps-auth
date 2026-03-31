import { AuthProvider, RequireAuth, useAuth } from "@monorepo/auth";
import { greet, formatDate } from "@monorepo/shared";

const gatewayUrl = import.meta.env.VITE_AUTH_GATEWAY_URL || "http://localhost:3000";
const requiredGroups = import.meta.env.VITE_REQUIRED_GROUPS
  ? import.meta.env.VITE_REQUIRED_GROUPS.split(",").map((g: string) => g.trim())
  : undefined;

function Home() {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "4rem auto",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1>App A</h1>
      {user && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <img
            src={user.picture}
            alt={user.name}
            style={{ width: 64, height: 64, borderRadius: "50%" }}
          />
          <p>{greet(user.name)}</p>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>{user.email}</p>
          <p style={{ color: "#999", fontSize: "0.8rem" }}>
            {formatDate(new Date())}
          </p>
          <button
            onClick={logout}
            style={{
              padding: "0.5rem 1.5rem",
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider gatewayUrl={gatewayUrl} requiredGroups={requiredGroups}>
      <RequireAuth>
        <Home />
      </RequireAuth>
    </AuthProvider>
  );
}
