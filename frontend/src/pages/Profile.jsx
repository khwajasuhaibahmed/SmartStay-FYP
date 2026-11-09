import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { initials, roleConfig } from "../constants/roles";
import { changePassword, getUser, saveUser, updateProfile } from "../services/api";
import { checkName, checkPassword, checkPhone } from "../utils/validation";

// =========================================================
// PROFILE PAGE
// =========================================================
export default function Profile() {
  const user = getUser();

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // =========================================================
  // SAVE PROFILE
  // =========================================================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const fieldError = checkName(fullName, "Full name") || checkPhone(phone);
    if (fieldError) return setProfileError(fieldError);

    setProfileLoading(true);

    try {
      const data = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      saveUser(data.user);
      setProfileSuccess("Profile updated successfully");
    } catch (err) {
      setProfileError(err.message || "Could not update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) return setPasswordError("Please enter your current password");
    const newPasswordError = checkPassword(newPassword, "New password");
    if (newPasswordError) return setPasswordError(newPasswordError);
    if (newPassword === currentPassword)
      return setPasswordError("New password must be different from the current one");
    if (newPassword !== confirmPassword)
      return setPasswordError("New passwords do not match");

    setPasswordLoading(true);

    try {
      const data = await changePassword({ currentPassword, newPassword });
      saveUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully");
    } catch (err) {
      setPasswordError(err.message || "Could not change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout title="My Profile">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal details and password</p>
        </div>
      </div>

      <div className="profile-layout">
        {/* Account summary */}
        <div className="bento-card profile-summary">
          <div className="profile-avatar">{initials(user.full_name)}</div>
          <div className="profile-name">{user.full_name}</div>
          <div className="profile-email">{user.email}</div>
          <span className="badge indigo">
            <span className="dot" />
            {roleConfig[user.role]?.label}
          </span>
          {user.hostel_name && (
            <div className="profile-hostel">
              {user.hostel_name} · <span className="cell-mono">{user.hostel_code}</span>
            </div>
          )}
          <div className="profile-meta">
            Member since{" "}
            {new Date(user.created_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        <div>
          {/* Profile details */}
          <form className="bento-card mb-6" onSubmit={handleSaveProfile}>
            <div className="card-header">
              <div className="card-title">Personal Details</div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                />
              </div>
              <div className="form-field">
                <label>Email (cannot be changed)</label>
                <input value={user.email} disabled />
              </div>
              <div className="form-field">
                <label>Role (set by admin)</label>
                <input value={roleConfig[user.role]?.label} disabled />
              </div>
            </div>

            {profileError && <div className="form-error">{profileError}</div>}
            {profileSuccess && <div className="form-success">{profileSuccess}</div>}

            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {/* Change password */}
          <form className="bento-card" onSubmit={handleChangePassword}>
            <div className="card-header">
              <div className="card-title">Change Password</div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"} passwords
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field full">
                <label>Current Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="form-field">
                <label>New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-field">
                <label>Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {passwordError && <div className="form-error">{passwordError}</div>}
            {passwordSuccess && <div className="form-success">{passwordSuccess}</div>}

            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
