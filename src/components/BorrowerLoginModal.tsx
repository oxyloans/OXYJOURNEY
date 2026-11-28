import React, { useState, useEffect } from "react";
import "./JourneyLoginModal.css";

export interface BorrowerLoginModalProps {
  open: boolean;
  onClose?: () => void;
  onSuccess: (auth: {
    userId: string;
    userMobile: string;
    accessToken?: string | null;
  }) => Promise<void> | void;
}

export default function BorrowerLoginModal({
  open,
  onClose,
  onSuccess,
}: BorrowerLoginModalProps) {
  const [mobileInput, setMobileInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setNotice("");
    }
  }, [open]);

  if (!open) return null;

  const validateMobile = (raw: string): { valid: boolean; cleaned: string; error?: string } => {
    let cleaned = raw.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = cleaned.slice(1);
    }

    if (!cleaned) {
      return { valid: false, cleaned: "", error: "Please enter your 10-digit mobile number." };
    }
    if (cleaned.length !== 10) {
      return {
        valid: false,
        cleaned,
        error: `Mobile number must be exactly 10 digits (currently ${cleaned.length} digits).`,
      };
    }
    if (!/^[6-9]/.test(cleaned)) {
      return {
        valid: false,
        cleaned,
        error: "Mobile number must start with 6, 7, 8, or 9.",
      };
    }
    return { valid: true, cleaned };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const validation = validateMobile(mobileInput);
    if (!validation.valid) {
      setError(validation.error || "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "https://meta.oxyloans.com/api/user-service/onlineRegistration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            countryCode: "+91",
            mobileNumber: validation.cleaned,
            registerFrom: "WEB",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.userId) {
        throw new Error(
          data.message || "Login / Registration failed. Please check your mobile number."
        );
      }

      // Store tokens and userId in localStorage
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("token", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userMobile", data.mobileNumber || validation.cleaned);
      localStorage.setItem("mobileNumber", data.mobileNumber || validation.cleaned);
      localStorage.setItem("primaryType", "CUSTOMER");

      setNotice(data.message || "Logged in successfully!");

      await onSuccess({
        userId: data.userId,
        userMobile: data.mobileNumber || validation.cleaned,
        accessToken: data.accessToken,
      });

      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify mobile number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oxj-login-layer" role="presentation">
      <div
        className="oxj-login-backdrop"
        onClick={loading ? undefined : onClose}
      />

      <section
        className="oxj-login-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="borrower-login-title"
      >
        <div className="oxj-login-brandline">
          <div className="oxj-login-mark">O</div>
          <div>
            <span>OXY JOURNEYS</span>
            <small>Borrower Verification</small>
          </div>
          {onClose && (
            <button
              type="button"
              className="oxj-login-close"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="oxj-login-content">
          <div className="oxj-login-copy">
            <span className="oxj-login-kicker">BORROWER PORTAL</span>
            <h2 id="borrower-login-title">Enter Mobile Number to Continue</h2>
            <p>
              Please enter your 10-digit mobile number to start or continue your loan application and access your application history.
            </p>
          </div>

          <form className="oxj-login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="borrower-mobile-input">Mobile Number</label>
            <div
              className="oxj-login-inputwrap"
              style={{
                display: "flex",
                alignItems: "center",
                border: error ? "1.5px solid #ef4444" : "1px solid #d0d5dd",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#ffffff",
                transition: "border-color 0.2s",
              }}
            >
              <span
                style={{
                  padding: "0 14px",
                  color: "#475467",
                  fontWeight: 600,
                  fontSize: "14px",
                  background: "#f9fafb",
                  borderRight: "1px solid #eaecf0",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                +91
              </span>
              <input
                id="borrower-mobile-input"
                value={mobileInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setMobileInput(val);
                  if (error) setError("");
                }}
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                placeholder="e.g. 9849257032"
                disabled={loading}
                autoFocus
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  padding: "0 14px",
                  fontSize: "16px",
                  height: "44px",
                  letterSpacing: "0.05em",
                }}
              />
            </div>

            <button
              type="submit"
              className="oxj-login-primary"
              disabled={loading || mobileInput.length < 10}
              style={{
                marginTop: "16px",
                height: "46px",
                fontSize: "15px",
                fontWeight: 600,
                opacity: loading || mobileInput.length < 10 ? 0.7 : 1,
                cursor: loading || mobileInput.length < 10 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying Mobile Number…" : "Continue with Mobile Number"}
            </button>

            <p className="oxj-login-hint" style={{ marginTop: "10px", fontSize: "12px", color: "#667085" }}>
              Must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.
            </p>
          </form>

          {notice && <div className="oxj-login-status success">{notice}</div>}
          {error && <div className="oxj-login-status error">{error}</div>}

          <p className="oxj-login-footnote" style={{ marginTop: "18px" }}>
            Your application data and loan history will be securely linked to this account.
          </p>
        </div>
      </section>
    </div>
  );
}
