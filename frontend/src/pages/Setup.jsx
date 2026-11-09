import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { getSetupStatus, runSetup, saveToken, saveUser } from "../services/api";
import { checkEmail, checkName, checkPassword } from "../utils/validation";
import "../styles/auth.css";

// =========================================================
// FIRST-TIME SETUP PAGE
// Shown only on a brand-new system (no Super Admin yet).
// Creates the first SmartStay Super Admin.
// =========================================================
export default function Setup() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [setupKey, setSetupKey] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once setup is done, this page is locked: send everyone to login.
  useEffect(() => {
    getSetupStatus()
      .then((data) => (data.needsSetup ? setChecking(false) : navigate("/login", { replace: true })))
      .catch(() => setChecking(false));
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");

    if (!setupKey.trim()) return setError("Please enter the setup key");
    const fieldError = checkName(fullName, "Full name") || checkEmail(email) || checkPassword(password);
    if (fieldError) return setError(fieldError);
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await runSetup({
        setupKey: setupKey.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Save session and open the Super Admin panel
      saveToken(data.token);
      saveUser(data.user);
      navigate("/platform");
    } catch (err) {
      setError(err.message || "Setup failed. Please try again.");
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="ss-auth-page">
      <div className="ss-auth-card">
        <div className="ss-auth-brand">
          <Logo />
          <span className="sb-brand">SmartStay</span>
        </div>

        <div className="ss-auth-icon">🚀</div>
        <h1 className="ss-auth-title">Set up SmartStay</h1>
        <p className="ss-auth-sub">
          Create the SmartStay Super Admin account. This page appears only once, on
          a new system.
        </p>

        <form onSubmit={handleSetup}>
          {/* Setup Key */}
          <div className="ss-field">
            <label>Setup Key</label>
            <input
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              placeholder="From the server's .env file"
              autoComplete="off"
            />
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
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
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

          <button type="submit" className="btn btn-primary ss-btn" disabled={loading}>
            {loading ? "Setting up..." : "Complete Setup →"}
          </button>
        </form>
      </div>
    </div>
  );
}
