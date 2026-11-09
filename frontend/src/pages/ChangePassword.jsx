import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { homePath } from "../constants/roles";
import { changePassword, clearSession, getUser, saveUser } from "../services/api";
import { checkPassword } from "../utils/validation";
import "../styles/auth.css";

// =========================================================
// CHANGE TEMPORARY PASSWORD PAGE
// Shown after the first login of an account created with a
// temporary password (e.g. a new hostel owner).
// =========================================================
export default function ChangePassword() {
  const navigate = useNavigate();
  const user = getUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) return setError("Please enter the temporary password from your email");
    const passwordError = checkPassword(newPassword, "New password");
    if (passwordError) return setError(passwordError);
    if (newPassword === currentPassword)
      return setError("New password must be different from the temporary one");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await changePassword({ currentPassword, newPassword });
      saveUser(data.user);
      navigate(homePath(data.user));
    } catch (err) {
      setError(err.message || "Could not change password. Please try again.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="ss-auth-page">
      <div className="ss-auth-card">
        <div className="ss-auth-brand">
          <Logo />
          <span className="sb-brand">SmartStay</span>
        </div>

        <div className="ss-auth-icon">🔐</div>
        <h1 className="ss-auth-title">Choose a new password</h1>
        <p className="ss-auth-sub">
          Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! You
          logged in with a temporary password. Please set your own password to
          continue.
        </p>

        <form onSubmit={handleChange}>
          {/* Temporary Password */}
          <div className="ss-field">
            <label>Temporary Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="From your welcome email"
              autoComplete="current-password"
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

          <button type="submit" className="btn btn-primary ss-btn" disabled={loading}>
            {loading ? "Saving..." : "Save New Password →"}
          </button>
        </form>

        <div className="ss-divider">or</div>

        <div className="ss-switch-prompt">
          <span className="ss-switch-link" onClick={handleLogout}>
            Log out
          </span>
        </div>
      </div>
    </div>
  );
}
