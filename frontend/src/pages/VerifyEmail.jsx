import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { homePath } from "../constants/roles";
import { resendVerification, saveToken, saveUser, verifyEmail } from "../services/api";
import "../styles/auth.css";

const RESEND_SECONDS = 60;

// =========================================================
// VERIFY EMAIL PAGE
// =========================================================
export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  // A code was just sent, so start the resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email) return setError("Email is missing. Please sign up or log in again.");
    if (!/^\d{6}$/.test(code)) return setError("Please enter the 6-digit code");

    setLoading(true);

    try {
      const data = await verifyEmail({ email, code });

      // Verified — save session and go to dashboard
      saveToken(data.token);
      saveUser(data.user);
      navigate(homePath(data.user));
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    try {
      const data = await resendVerification(email);
      setInfo(data.message);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || "Could not resend the code");
      if (err.wait) setResendIn(err.wait);
    }
  };

  return (
    <div className="ss-auth-page">
      <div className="ss-auth-card">
        <div className="ss-auth-brand">
          <Logo />
          <span className="sb-brand">SmartStay</span>
        </div>

        <div className="ss-auth-icon">✉️</div>
        <h1 className="ss-auth-title">Verify your email</h1>
        <p className="ss-auth-sub">
          We sent a 6-digit code to <strong>{email || "your email"}</strong>. Enter it
          below to activate your account.
        </p>

        <form onSubmit={handleVerify}>
          <div className="ss-field">
            <label>Verification Code</label>
            <input
              className="ss-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {error && <div className="ss-error">{error}</div>}
          {info && <div className="ss-info">{info}</div>}

          <button type="submit" className="btn btn-primary ss-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify Email →"}
          </button>
        </form>

        <div className="ss-resend">
          Didn't get the code?{" "}
          {resendIn > 0 ? (
            <span className="ss-muted-text">Resend in {resendIn}s</span>
          ) : (
            <span className="ss-switch-link" onClick={handleResend}>
              Resend code
            </span>
          )}
        </div>

        <div className="ss-divider">or</div>

        <div className="ss-switch-prompt">
          Wrong email?{" "}
          <span className="ss-switch-link" onClick={() => navigate("/register")}>
            Sign up again
          </span>
        </div>
      </div>
    </div>
  );
}
