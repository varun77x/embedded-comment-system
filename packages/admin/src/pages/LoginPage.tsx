import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, register } from "../api.js";
import { useAuth } from "../context/AuthContext.js";

export function LoginPage() {
  const { login: ctxLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, displayName);
      await ctxLogin(res.token);
      navigate("/dashboard");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>UCS Admin</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {err && <p className="error">{err}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="toggle">
          {mode === "login" ? "No account? " : "Already have one? "}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
