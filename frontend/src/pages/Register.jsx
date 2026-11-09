import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { registerUser } from "../services/api";
import {
  checkEmail,
  checkHostelCode,
  checkName,
  checkPassword,
  checkPhone,
} from "../utils/validation";
import "../styles/auth.css";

// =========================================================
// REGISTER PAGE
// =========================================================
export default function Register() {
  const navigate = useNavigate();

  const [hostelCode, setHostelCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign-up is for Residents only.
  // Staff, Warden and Admin accounts are created by the hostel administration.

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const fieldError =
      checkHostelCode(hostelCode) ||
      checkName(fullName, "Full name") ||
      checkEmail(email) ||
      checkPhone(phone) ||
      checkPassword(password);
    if (fieldError) return setError(fieldError);
    if (password !== confirmPassword)
      return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await registerUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        hostelCode: hostelCode.trim().toUpperCase(),
      });

      // Account created — verify the email before first login
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
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

        <h1 className="ss-auth-title">Create resident account</h1>
        <p className="ss-auth-sub">
          Staff, Warden or Admin? Your account is created by the hostel
          administration.
        </p>

        <form onSubmit={handleRegister}>
          {/* Hostel Code */}
          <div className="ss-field">
            <label>Hostel Code</label>
            <input
              className="ss-hostel-code"
              value={hostelCode}
              onChange={(e) => setHostelCode(e.target.value.toUpperCase())}
              placeholder="e.g. IGH-4821"
              autoComplete="off"
            />
            <p className="ss-field-hint">Ask your warden for your hostel's code.</p>
          </div>

          {/* Full Name */}
          <div className="ss-field">
            <label>Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name (letters only)"
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="ss-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          {/* Phone */}
          <div className="ss-field">
            <label>Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300-1234567"
              autoComplete="tel"
            />
          </div>

          {/* Password */}
          <div className="ss-field">
            <label>Password</label>
            <div className="ss-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <label>Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="ss-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary ss-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <div className="ss-divider">or</div>

        <div className="ss-switch-prompt">
          Already have an account?{" "}
          <span className="ss-switch-link" onClick={() => navigate("/login")}>
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
