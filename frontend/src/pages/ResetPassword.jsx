import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { forgotPassword, resetPassword } from "../services/api";
import { checkPassword } from "../utils/validation";
import "../styles/auth.css";

const RESEND_SECONDS = 60;

// =========================================================
// RESET PASSWORD PAGE
// =========================================================
export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email) return setError("Email is missing. Please start again from Forgot Password.");
    if (!/^\d{6}$/.test(code)) return setError("Please enter the 6-digit code");
    const passwordError = checkPassword(newPassword, "New password");
    if (passwordError) return setError(passwordError);
    if (newPassword !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await resetPassword({ email, code, newPassword });
      navigate("/login", { state: { message: data.message, email } });
    } catch (err) {
      setError(err.message || "Could not reset password. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    try {
      const data = await forgotPassword(email);
      setInfo(data.message);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || "Could not resend the code");
    }
  };

  return (
    <div className="ss-auth-page">
      <div className="ss-auth-card">
        <div className="ss-auth-brand">
          <Logo />
          <span className="sb-brand">SmartStay</span>
        </div>

        <div className="ss-auth-icon">🔒</div>
        <h1 className="ss-auth-title">Set a new password</h1>
        <p className="ss-auth-sub">
          If <strong>{email || "your email"}</strong> has an account, we sent it a
          6-digit code. Enter the code and choose a new password.
        </p>

        <form onSubmit={handleReset}>
          {/* Code */}
          <div className="ss-field">
            <label>Reset Code</label>
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

          {/* New Password */}
          <div className="ss-field">
            <label>New Password</label>
            <div className="ss-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="ss-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="ss-field">
            <label>Confirm New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="ss-error">{error}</div>}
          {info && <div className="ss-info">{info}</div>}

          <button type="submit" className="btn btn-primary ss-btn" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password →"}
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
          <span className="ss-switch-link" onClick={() => navigate("/login")}>
            Back to Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
