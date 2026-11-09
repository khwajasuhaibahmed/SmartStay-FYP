import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { homePath } from "../constants/roles";
import { getSetupStatus, loginUser, saveToken, saveUser } from "../services/api";
import { checkEmail, checkPassword } from "../utils/validation";
import "../styles/auth.css";

// =========================================================
// LOGIN PAGE
// =========================================================
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Message + email passed back after a password reset
  const successMessage = location.state?.message || "";

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // A brand-new system has no Super Admin yet: open the first-time setup page.
  useEffect(() => {
    getSetupStatus()
      .then((data) => data.needsSetup && navigate("/setup"))
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const emailError = checkEmail(email);
    if (emailError) return setError(emailError);
    const passwordError = checkPassword(password);
    if (passwordError) return setError(passwordError);

    setLoading(true);

    try {
      const data = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      // Save session
      saveToken(data.token);
      saveUser(data.user);

      // Super Admin -> Hostels, hostel users -> Dashboard, temporary password -> change it first
      navigate(homePath(data.user));
    } catch (err) {
      // Account exists but email isn't verified yet — a code was just sent
      if (err.code === "EMAIL_NOT_VERIFIED") {
        navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setError(err.message || "Login failed. Check your credentials.");
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

        <h1 className="ss-auth-title">Welcome back</h1>
        <p className="ss-auth-sub">Sign in to your SmartStay account</p>

        <form onSubmit={handleLogin}>
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
                placeholder="••••••••"
                autoComplete="current-password"
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
            <div className="ss-forgot-wrap">
              <span
                className="ss-switch-link ss-forgot-link"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </span>
            </div>
          </div>

          {successMessage && !error && <div className="ss-info">{successMessage}</div>}
          {error && <div className="ss-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary ss-btn"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div className="ss-divider">or</div>

        <div className="ss-switch-prompt">
          Don't have an account?{" "}
          <span className="ss-switch-link" onClick={() => navigate("/register")}>
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
}
