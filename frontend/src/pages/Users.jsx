import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { initials } from "../constants/roles";
import { addUser, getUser, getUsers, setUserStatus } from "../services/api";
import { checkEmail, checkName, checkPhone } from "../utils/validation";

// =========================================================
// ROLE BADGES
// =========================================================
const roleBadge = {
  admin: { label: "Admin", className: "indigo" },
  warden: { label: "Warden", className: "amber" },
  staff: { label: "Staff", className: "cyan" },
  resident: { label: "Resident", className: "green" },
};

// Which roles each user may add (the backend checks the same rule).
const CAN_CREATE = {
  admin: ["warden", "staff", "admin"],
  warden: ["staff"],
};

const avatarColors = ["#4F46E5", "#F43F5E", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

// =========================================================
// USERS & ROLES PAGE (Admin) / STAFF PAGE (Warden)
// =========================================================
export default function Users() {
  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";
  const creatableRoles = CAN_CREATE[currentUser?.role] || [];

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Role filter lives in the URL (/users?role=warden) so dashboard cards can link to it
  const roleParam = searchParams.get("role");
  const roleFilter = isAdmin && roleBadge[roleParam] ? roleParam : "all";
  const setRoleFilter = (role) => setSearchParams(role === "all" ? {} : { role });

  // Add user form (opens automatically with /users?add=1)
  const [showForm, setShowForm] = useState(searchParams.get("add") === "1");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newRole, setNewRole] = useState(creatableRoles[0] || "staff");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message || "Could not load users"))
      .finally(() => setLoading(false));
  }, []);

  // =========================================================
  // ADD USER
  // =========================================================
  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(null);

    const fieldError = checkName(fullName, "Full name") || checkEmail(email) || checkPhone(phone);
    if (fieldError) return setFormError(fieldError);

    setFormLoading(true);

    try {
      const data = await addUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: newRole,
      });
      setUsers((prev) => [data.user, ...prev]);
      setFormSuccess(data);
      setFullName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setFormError(err.message || "Could not add the user");
    } finally {
      setFormLoading(false);
    }
  };

  // =========================================================
  // ACTIVATE / DEACTIVATE (Admin only)
  // =========================================================
  const handleToggleStatus = async (user) => {
    const action = user.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    setError("");
    setUpdatingId(user.id);

    try {
      const data = await setUserStatus(user.id, !user.is_active);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data.user } : u)));
    } catch (err) {
      setError(err.message || `Could not ${action} user`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const roleUsers = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);
  const activeCount = roleUsers.filter((u) => u.is_active).length;
  const pageTitle = !isAdmin
    ? "Staff"
    : roleFilter === "all"
      ? "Users & Roles"
      : `${roleBadge[roleFilter].label} Accounts`;
  const columns = isAdmin ? 6 : 5;

  return (
    <DashboardLayout title={pageTitle}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">
            {roleUsers.length} account{roleUsers.length === 1 ? "" : "s"} · {activeCount}{" "}
            active · {roleUsers.length - activeCount} deactivated
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : isAdmin ? "+ Add User" : "+ Add Staff"}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <form className="bento-card mb-6" onSubmit={handleAddUser}>
          <div className="card-header">
            <div>
              <div className="card-title">{isAdmin ? "Add a user" : "Add a staff member"}</div>
              <p className="card-text form-intro">
                They will get an email with a temporary password and must choose their
                own password when they first log in. Residents join with the hostel code
                instead.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Letters only"
              />
            </div>
            <div className="form-field">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
              />
            </div>
            <div className="form-field">
              <label>Phone (optional)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-1234567"
              />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select
                className="form-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={creatableRoles.length === 1}
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleBadge[r].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}
          {formSuccess && (
            <div className="form-success">
              {formSuccess.message}
              {formSuccess.tempPassword && (
                <>
                  {" "}Temporary password:{" "}
                  <strong className="cell-mono">{formSuccess.tempPassword}</strong>
                </>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? "Adding..." : isAdmin ? "Add User" : "Add Staff Member"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="toolbar">
        <div className="search-input">
          <span>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
          />
        </div>
        {isAdmin && (
          <div className="chip-group">
            {["all", "admin", "warden", "staff", "resident"].map((r) => (
              <button
                key={r}
                className={`chip ${roleFilter === r ? "active" : ""}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === "all" ? "All" : roleBadge[r].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Table */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Status</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns} className="table-empty">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={columns} className="table-empty">
                  {users.length === 0 ? "No accounts yet." : "No users match your search."}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={u.is_active ? "" : "row-inactive"}>
                    <td>
                      <div className="avatar-group">
                        <div
                          className="avatar"
                          style={{ background: avatarColors[u.id % avatarColors.length] }}
                        >
                          {initials(u.full_name)}
                        </div>
                        <div>
                          <div className="cell-title">
                            {u.full_name} {isSelf && <span className="you-tag">You</span>}
                          </div>
                          <div className="cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge[u.role].className}`}>
                        {roleBadge[u.role].label}
                      </span>
                    </td>
                    <td className="cell-mono">{u.phone || "—"}</td>
                    <td className="cell-muted">
                      {new Date(u.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td>
                      {!u.is_active ? (
                        <span className="badge red">
                          <span className="dot" />
                          Deactivated
                        </span>
                      ) : u.must_change_password ? (
                        <span className="badge amber">
                          <span className="dot" />
                          Awaiting first login
                        </span>
                      ) : (
                        <span className="badge green">
                          <span className="dot" />
                          Active
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-secondary"}`}
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf || updatingId === u.id}
                          title={isSelf ? "You cannot deactivate your own account" : undefined}
                        >
                          {updatingId === u.id
                            ? "Saving..."
                            : u.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
