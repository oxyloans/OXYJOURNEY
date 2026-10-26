import { useEffect, useMemo, useRef, useState } from "react";
import {
  requestJourneyOtp,
  verifyJourneyOtp,
  type JourneyOtpMethod,
} from "../services/vibeCodeApi";

type JourneyLoginModalProps = {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onSuccess: (auth: {
    userId: string;
    userMobile: string;
    accessToken?: string | null;
  }) => Promise<void> | void;
};

type OtpMeta = {
  session: string;
  salt: string;
  expiryTime: string;
};

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return `+91${cleaned.replace(/^0+/, "")}`;
}

function splitPhone(value: string) {
  const normalized = normalizePhone(value);

  if (normalized.startsWith("+91")) {
    return {
      countryCode: "+91",
      phoneNumber: normalized.slice(3),
      normalized,
    };
  }

  // For WhatsApp international numbers, keep a practical fallback: first
  // 1–3 digits after + are treated as country code, remainder as number.
  const match = normalized.match(/^\+(\d{1,3})(\d{6,15})$/);
  if (match) {
    return {
      countryCode: `+${match[1]}`,
      phoneNumber: match[2],
      normalized,
    };
  }

  return { countryCode: "+91", phoneNumber: normalized.replace(/^\+/, ""), normalized };
}

export default function JourneyLoginModal({
  open,
  sessionId,
  onClose,
  onSuccess,
}: JourneyLoginModalProps) {
  const [method, setMethod] = useState<JourneyOtpMethod>("whatsapp");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpMeta, setOtpMeta] = useState<OtpMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const deviceId = useMemo(() => {
    const existing = sessionStorage.getItem("oxyJourneyDeviceId");
    if (existing) return existing;
    const value =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("oxyJourneyDeviceId", value);
    return value;
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setNotice("");
  }, [open]);

  useEffect(() => {
    if (!otpMeta) return;
    window.setTimeout(() => otpInputRef.current?.focus(), 80);
  }, [otpMeta]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const requiredOtpLength = method === "whatsapp" ? 4 : 6;
  const phoneData = splitPhone(phone);
  const validPhone = /^\d{7,15}$/.test(phoneData.phoneNumber);

  async function sendOtp() {
    if (!validPhone || loading) {
      setError("Enter a valid mobile number with country code.");
      return;
    }

    if (method === "mobile" && phoneData.countryCode !== "+91") {
      setError("SMS OTP is currently available for Indian (+91) numbers only.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await requestJourneyOtp({
        phoneNumber: phoneData.phoneNumber,
        countryCode: phoneData.countryCode,
        method,
        deviceId,
      });

      const otpSession =
        response.mobileOtpSession || response.whatsappOtpSession || "";

      if (!otpSession || !response.salt || !response.otpGeneratedTime) {
        throw new Error(
          response.message || "Unable to start OTP login for this number."
        );
      }

      setOtpMeta({
        session: otpSession,
        salt: response.salt,
        expiryTime: response.otpGeneratedTime,
      });
      setOtp("");
      setNotice(`OTP sent to your ${method === "whatsapp" ? "WhatsApp" : "mobile"}.`);
      setResendSeconds(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otpMeta || loading) return;
    if (otp.length !== requiredOtpLength) {
      setError(`Enter the complete ${requiredOtpLength}-digit OTP.`);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await verifyJourneyOtp({
        phoneNumber: phoneData.phoneNumber,
        countryCode: phoneData.countryCode,
        method,
        deviceId,
        otp,
        otpSession: otpMeta.session,
        salt: otpMeta.salt,
        expiryTime: otpMeta.expiryTime,
      });

      const apiMessage = (response.message || "").toLowerCase();
      if (
        apiMessage.includes("invalid") ||
        apiMessage.includes("incorrect") ||
        apiMessage.includes("expired") ||
        apiMessage.includes("wrong")
      ) {
        throw new Error(response.message || "Invalid OTP. Please try again.");
      }

      if (!response.userId) {
        throw new Error(response.message || "Login could not be completed.");
      }

      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("token", response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      localStorage.setItem("userId", response.userId);
      localStorage.setItem("userMobile", phoneData.phoneNumber);
      localStorage.setItem(
        method === "whatsapp" ? "whatsappNumber" : "mobileNumber",
        phoneData.phoneNumber
      );
      localStorage.setItem("primaryType", "CUSTOMER");

      setNotice("Login successful. Connecting your journey…");
      await onSuccess({
        userId: response.userId,
        userMobile: phoneData.phoneNumber,
        accessToken: response.accessToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  function changeNumber() {
    if (loading) return;
    setOtpMeta(null);
    setOtp("");
    setError("");
    setNotice("");
    setResendSeconds(0);
  }

  return (
    <div className="oxj-login-layer" role="presentation">
      <button
        className="oxj-login-backdrop"
        type="button"
        aria-label="Close login"
        onClick={loading ? undefined : onClose}
      />

      <section
        className="oxj-login-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oxj-login-title"
      >
        <div className="oxj-login-brandline">
          <div className="oxj-login-mark">O</div>
          <div>
            <span>OXY JOURNEYS</span>
            <small>Continue your journey</small>
          </div>
          <button
            type="button"
            className="oxj-login-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close login"
          >
            ×
          </button>
        </div>

        <div className="oxj-login-content">
          <div className="oxj-login-copy">
            <span className="oxj-login-kicker">YOUR CHAT IS SAFE</span>
            <h2 id="oxj-login-title">Login to keep this journey going</h2>
            <p>
              You’ve reached the free chat limit. Verify your number here and
              continue in the same conversation — no page change, no restart.
            </p>
          </div>

          <div className="oxj-login-methods" role="tablist" aria-label="OTP method">
            <button
              type="button"
              className={method === "whatsapp" ? "active whatsapp" : ""}
              onClick={() => {
                if (otpMeta || loading) return;
                setMethod("whatsapp");
                setError("");
              }}
            >
              WhatsApp OTP
            </button>
            <button
              type="button"
              className={method === "mobile" ? "active sms" : ""}
              onClick={() => {
                if (otpMeta || loading) return;
                setMethod("mobile");
                setError("");
                if (!phone.startsWith("+91")) setPhone("+91");
              }}
            >
              SMS OTP
            </button>
          </div>

          {!otpMeta ? (
            <div className="oxj-login-form">
              <label htmlFor="oxj-login-phone">
                {method === "whatsapp" ? "WhatsApp number" : "Mobile number"}
              </label>
              <div className="oxj-login-inputwrap">
                <input
                  id="oxj-login-phone"
                  value={phone}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^\d+\s()-]/g, "");
                    setPhone(value);
                    if (error) setError("");
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                className="oxj-login-primary"
                onClick={sendOtp}
                disabled={!validPhone || loading}
              >
                {loading ? "Sending OTP…" : `Get OTP via ${method === "whatsapp" ? "WhatsApp" : "SMS"}`}
              </button>
              <p className="oxj-login-hint">
                {method === "whatsapp"
                  ? "WhatsApp OTP supports India and international numbers."
                  : "SMS OTP is currently for +91 Indian numbers."}
              </p>
            </div>
          ) : (
            <div className="oxj-login-form">
              <div className="oxj-login-sentrow">
                <div>
                  <span>OTP sent to</span>
                  <strong>{phoneData.normalized}</strong>
                </div>
                <button type="button" onClick={changeNumber} disabled={loading}>
                  Change
                </button>
              </div>

              <label htmlFor="oxj-login-otp">Enter {requiredOtpLength}-digit OTP</label>
              <input
                ref={otpInputRef}
                id="oxj-login-otp"
                className="oxj-login-otp"
                value={otp}
                onChange={(event) => {
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, requiredOtpLength)
                  );
                  if (error) setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && otp.length === requiredOtpLength) {
                    void verifyOtp();
                  }
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={"•".repeat(requiredOtpLength)}
                disabled={loading}
              />

              <button
                type="button"
                className="oxj-login-primary"
                onClick={verifyOtp}
                disabled={otp.length !== requiredOtpLength || loading}
              >
                {loading ? "Verifying…" : "Verify & continue journey"}
              </button>

              <button
                type="button"
                className="oxj-login-resend"
                onClick={sendOtp}
                disabled={loading || resendSeconds > 0}
              >
                {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
              </button>
            </div>
          )}

          {notice &&<div className="oxj-login-status success">{notice}</div>}
          {error && <div className="oxj-login-status error">{error}</div>}

          <p className="oxj-login-footnote">
            Your existing conversation stays with you after sign in.
          </p>
        </div>
      </section>
    </div>
  );
}
