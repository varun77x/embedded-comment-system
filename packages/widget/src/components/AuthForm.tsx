import { h } from "preact";
import { useState } from "preact/hooks";
import { loginWithEmail, registerWithEmail, openGoogleOAuth } from "../api.js";
import { setToken } from "../store/auth.js";
import { API_BASE } from "../config.js";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for token from Google OAuth popup
  const handleGoogleMessage = (e: MessageEvent) => {
    if (e.data?.type === "UCS_AUTH" && typeof e.data.token === "string") {
      setToken(e.data.token);
      window.removeEventListener("message", handleGoogleMessage);
    }
  };

  function handleGoogleClick() {
    window.addEventListener("message", handleGoogleMessage);
    openGoogleOAuth(API_BASE);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await loginWithEmail(email, password)
          : await registerWithEmail(email, password, displayName);
      setToken(res.token);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="auth-form">
      <button type="button" class="btn btn-google" onClick={handleGoogleClick}>
        Sign in with Google
      </button>

      <div class="divider">or</div>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
            required
            minLength={2}
            maxLength={50}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          required
          minLength={8}
        />
        {err && <p class="error">{err}</p>}
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p class="auth-toggle">
        {mode === "login" ? "No account? " : "Already have one? "}
        <button
          type="button"
          class="link-btn"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}
        >
          {mode === "login" ? "Register" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
