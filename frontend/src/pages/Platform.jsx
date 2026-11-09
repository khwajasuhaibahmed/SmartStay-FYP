import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { createHostel, getHostels, setHostelStatus } from "../services/api";
import { checkEmail, checkName, checkPhone } from "../utils/validation";

// =========================================================
// STATUS BADGES
// =========================================================
const statusBadge = {
  trial: { label: "Free trial", className: "amber" },
  active: { label: "Active", className: "green" },
  suspended: { label: "Suspended", className: "red" },
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "—");

// =========================================================
// SUPER ADMIN: HOSTELS PAGE
// =========================================================
export default function Platform() {
  const [hostels, setHostels] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Add hostel form
  const [showForm, setShowForm] = useState(false);
  const [hostelName, setHostelName] = useState("");
  const [city, setCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const loadHostels = () =>
    getHostels()
      .then((data) => {
        setHostels(data.hostels);
        setStats(data.stats);
      })
      .catch((err) => setError(err.message || "Could not load hostels"))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadHostels();
  }, []);

  // =========================================================
  // ADD HOSTEL + OWNER
  // =========================================================
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setCreated(null);

    if (hostelName.trim().length < 3) return setFormError("Please enter the hostel name");
    if (!/^[A-Za-z]/.test(hostelName.trim()))
      return setFormError("Hostel name must start with a letter");
    if (city.trim() && !/^[A-Za-z][A-Za-z ]*$/.test(city.trim()))
      return setFormError("City can contain only letters and spaces");
    const fieldError =
      checkName(ownerName, "Owner's name") || checkEmail(ownerEmail) || checkPhone(ownerPhone);
    if (fieldError) return setFormError(fieldError);

    setFormLoading(true);

    try {
      const data = await createHostel({
        hostelName: hostelName.trim(),
        city: city.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim(),
      });
      setCreated(data);
      setHostelName("");
      setCity("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPhone("");
      loadHostels();
    } catch (err) {
      setFormError(err.message || "Could not create the hostel");
    } finally {
      setFormLoading(false);
    }
  };

  // =========================================================
  // SUSPEND / ACTIVATE
  // =========================================================
  const handleStatus = async (hostel, status) => {
    const action = status === "suspended" ? "suspend" : "activate";
    const warning =
      status === "suspended" ? " All of its users will be logged out and blocked." : "";
    if (!window.confirm(`Are you sure you want to ${action} ${hostel.name}?${warning}`)) return;

    setError("");
    setUpdatingId(hostel.id);

    try {
      await setHostelStatus(hostel.id, status);
      await loadHostels();
    } catch (err) {
      setError(err.message || `Could not ${action} the hostel`);
    } finally {
      setUpdatingId(null);
    }
  };

  const kpis = [
    { title: "Total Hostels", value: stats?.total, icon: "🏢", color: "blue", status: "all", link: "View all hostels" },
    { title: "Active", value: stats?.active, icon: "✅", color: "emerald", status: "active", link: "View active hostels" },
    { title: "On Free Trial", value: stats?.trial, icon: "⏳", color: "amber", status: "trial", link: "View trial hostels" },
    { title: "Suspended", value: stats?.suspended, icon: "⛔", color: "rose", status: "suspended", link: "View suspended hostels" },
    { title: "Total Users", value: stats?.users, icon: "👥", color: "cyan", status: "all", link: "View users per hostel" },
  ];

  const filteredHostels =
    statusFilter === "all" ? hostels : hostels.filter((h) => h.status === statusFilter);

  // =========================================================
  // KPI CLICK: filter the table and scroll to it
  // =========================================================
  const handleKpiClick = (status) => {
    setStatusFilter(status);
    document.getElementById("hostels-table")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <DashboardLayout title="Hostels">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hostels on SmartStay</h1>
          <p className="page-subtitle">
            Onboard new hostels and manage their subscription status
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "+ Add Hostel"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.title} className="kpi clickable" onClick={() => handleKpiClick(k.status)}>
            <div className="kpi-top">
              <div className="kpi-title">{k.title}</div>
              <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
            </div>
            <div className="kpi-value">{k.value ?? "—"}</div>
            <div className="kpi-link">{k.link} →</div>
          </div>
        ))}
      </div>

      {/* Add Hostel Form */}
      {showForm && (
        <form className="bento-card mb-6" onSubmit={handleCreate}>
          <div className="card-header">
            <div>
              <div className="card-title">Add a new hostel</div>
              <p className="card-text form-intro">
                The owner gets an email with a temporary password and the hostel
                code. The hostel starts with a 30-day free trial.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Hostel Name</label>
              <input
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                placeholder="e.g. Imperial Girls Hostel"
              />
            </div>
            <div className="form-field">
              <label>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
            </div>
            <div className="form-field">
              <label>Owner's Full Name</label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Letters only"
              />
            </div>
            <div className="form-field">
              <label>Owner's Email</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@email.com"
              />
            </div>
            <div className="form-field">
              <label>Owner's Phone (optional)</label>
              <input
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="0300-1234567"
              />
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}
          {created && (
            <div className="form-success">
              {created.message} Hostel code:{" "}
              <strong className="cell-mono">{created.hostel.code}</strong>
              {created.tempPassword && (
                <>
                  {" "}· Temporary password:{" "}
                  <strong className="cell-mono">{created.tempPassword}</strong>
                </>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? "Creating..." : "Create Hostel & Owner Account"}
          </button>
        </form>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* Hostels Table */}
      {statusFilter !== "all" && (
        <div className="filter-note">
          Showing <strong>{statusBadge[statusFilter].label}</strong> hostels ·{" "}
          <button className="link-btn" onClick={() => setStatusFilter("all")}>
            Show all
          </button>
        </div>
      )}
      <div className="table-card" id="hostels-table">
        <table>
          <thead>
            <tr>
              <th>Hostel</th>
              <th>Code</th>
              <th>Owner</th>
              <th>Users</th>
              <th>Status</th>
              <th>Trial ends</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="table-empty">Loading hostels...</td>
              </tr>
            ) : hostels.length === 0 ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  No hostels yet. Click "Add Hostel" to onboard the first one.
                </td>
              </tr>
            ) : filteredHostels.length === 0 ? (
              <tr>
                <td colSpan="7" className="table-empty">
                  No {statusBadge[statusFilter].label.toLowerCase()} hostels.
                </td>
              </tr>
            ) : (
              filteredHostels.map((h) => (
                <tr key={h.id} className={h.status === "suspended" ? "row-inactive" : ""}>
                  <td>
                    <div className="cell-title">{h.name}</div>
                    <div className="cell-sub">{h.city || "—"}</div>
                  </td>
                  <td className="cell-mono">{h.code}</td>
                  <td>
                    <div className="cell-title">{h.owner_name || "—"}</div>
                    <div className="cell-sub">{h.owner_email || ""}</div>
                  </td>
                  <td>
                    <div className="cell-title">{h.user_count}</div>
                    <div className="cell-sub">{h.resident_count} residents</div>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[h.status].className}`}>
                      <span className="dot" />
                      {statusBadge[h.status].label}
                    </span>
                  </td>
                  <td className="cell-muted">
                    {h.status === "trial" ? formatDate(h.trial_ends_at) : "—"}
                  </td>
                  <td>
                    <div className="action-group">
                      {h.status !== "active" && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatus(h, "active")}
                          disabled={updatingId === h.id}
                        >
                          Activate
                        </button>
                      )}
                      {h.status !== "suspended" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleStatus(h, "suspended")}
                          disabled={updatingId === h.id}
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
