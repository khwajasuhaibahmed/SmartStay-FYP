import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { forgotPassword } from "../services/api";
import { checkEmail } from "../utils/validation";
import "../styles/auth.css";

// =========================================================
// FORGOT PASSWORD PAGE
// =========================================================
export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailError = checkEmail(email);
    if (emailError) return setError(emailError);

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      await forgotPassword(cleanEmail);
      navigate(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
    } catch (err) {
      setError(err.message || "Could not send the reset code. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="ss-auth-page">
      <div className="ss-auth-card">
        <div className="ss-auth-brand">
          <Logo />
          <span className="sb-brand">SmartStay</span>
        </div>

        <div className="ss-auth-icon">🔑</div>
        <h1 className="ss-auth-title">Forgot password?</h1>
        <p className="ss-auth-sub">
          Enter your account email and we'll send you a 6-digit code to reset your
          password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="ss-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <div className="ss-error">{error}</div>}

          <button type="submit" className="btn btn-primary ss-btn" disabled={loading}>
            {loading ? "Sending code..." : "Send Reset Code →"}
          </button>
        </form>

        <div className="ss-divider">or</div>

        <div className="ss-switch-prompt">
          Remembered it?{" "}
          <span className="ss-switch-link" onClick={() => navigate("/login")}>
            Back to Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
