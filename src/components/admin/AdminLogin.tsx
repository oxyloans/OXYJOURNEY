import React, { useState } from "react";
import { adminLogin } from "../../services/adminApi";
import { LOGO } from "../../data/journeyData";
import { Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import "./AdminLogin.css";

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const res = adminLogin(username, password, rememberMe);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.error || "Invalid username or password.");
        setLoading(false);
      }
    }, 280);
  };

  return (
    <div className="al-container">
      {/* Ambient background glow effects */}
      <div className="al-glow al-glow-1" aria-hidden="true" />
      <div className="al-glow al-glow-2" aria-hidden="true" />
      <div className="al-glow al-glow-3" aria-hidden="true" />

      <div className="al-card-wrapper">
        <div className="al-card">
          <div className="al-header">
            <div className="al-brand-wrapper">
              <img
                src={LOGO}
                alt="OXY Journeys"
                className="al-brand-logo"
                onError={(e) => {
                  e.currentTarget.src = "https://i.ibb.co/XxJJRXx5/jun-logo.png";
                }}
              />
            </div>

            <h1 className="al-title">Admin Portal</h1>
          </div>

          {error && (
            <div className="al-error-banner" role="alert" aria-live="assertive">
              <AlertCircle size={18} className="al-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="al-form" noValidate>
            <div className="al-field">
              <label htmlFor="admin-username" className="al-label">
                Username
              </label>
              <div className="al-input-wrap">
                <User size={18} className="al-input-icon" aria-hidden="true" />
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="al-input"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="al-field">
              <label htmlFor="admin-password" className="al-label">
                Password
              </label>
              <div className="al-input-wrap">
                <Lock size={18} className="al-input-icon" aria-hidden="true" />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="al-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="al-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="al-options">
              <label className="al-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              className={`al-submit-btn ${loading ? "is-loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <span className="al-btn-loader">
                  <span className="al-spinner" aria-hidden="true" />
                  <span>Authenticating…</span>
                </span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
