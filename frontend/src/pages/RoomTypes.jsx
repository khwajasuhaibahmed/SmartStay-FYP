import { Fragment, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { FACILITIES, formatRs } from "../constants/rooms";
import {
  createRoomType,
  deleteRoomType,
  getRentHistory,
  getRoomTypes,
  getUser,
  updateRoomType,
} from "../services/api";
import { checkAmount, checkPlaceName } from "../utils/validation";

// =========================================================
// ROOM TYPES & RENT PACKAGES PAGE (Admin edits · Warden views)
// =========================================================
export default function RoomTypes() {
  const isAdmin = getUser()?.role === "admin";

  const [roomTypes, setRoomTypes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Add / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [isAc, setIsAc] = useState(false);
  const [sharingCapacity, setSharingCapacity] = useState("2");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Rent history (one room type at a time)
  const [historyId, setHistoryId] = useState(null);
  const [history, setHistory] = useState([]);

  const loadRoomTypes = () =>
    getRoomTypes()
      .then((data) => setRoomTypes(data.roomTypes))
      .catch((err) => setError(err.message || "Could not load room types"))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadRoomTypes();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setIsAc(false);
    setSharingCapacity("2");
    setMonthlyRate("");
    setSecurityDeposit("");
    setFacilities([]);
    setDescription("");
    setFormError("");
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setName(t.name);
    setIsAc(t.is_ac);
    setSharingCapacity(String(t.sharing_capacity));
    setMonthlyRate(t.monthly_rate === null ? "" : String(Number(t.monthly_rate)));
    setSecurityDeposit(t.security_deposit === null ? "" : String(Number(t.security_deposit)));
    setFacilities(t.facilities || []);
    setDescription(t.description || "");
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFacility = (f) =>
    setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  // =========================================================
  // SAVE ROOM TYPE + RENT PACKAGE
  // =========================================================
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const fieldError =
      checkPlaceName(name, "Room type name") ||
      checkAmount(monthlyRate, "Monthly rent") ||
      (securityDeposit !== "" ? checkAmount(securityDeposit, "Security deposit") : "");
    if (fieldError) return setFormError(fieldError);

    setFormLoading(true);

    try {
      const roomType = {
        name: name.trim(),
        isAc,
        sharingCapacity: Number(sharingCapacity),
        facilities,
        description: description.trim(),
        monthlyRate: Number(monthlyRate),
        securityDeposit: securityDeposit === "" ? 0 : Number(securityDeposit),
      };
      const data = editingId
        ? await updateRoomType(editingId, roomType)
        : await createRoomType(roomType);
      setFormSuccess(data.message);
      resetForm();
      if (historyId) setHistoryId(null);
      loadRoomTypes();
    } catch (err) {
      setFormError(err.message || "Could not save the room type");
    } finally {
      setFormLoading(false);
    }
  };

  // =========================================================
  // DELETE ROOM TYPE
  // =========================================================
  const handleDelete = async (t) => {
    if (!window.confirm(`Delete the room type "${t.name}"?`)) return;
    setError("");

    try {
      await deleteRoomType(t.id);
      setRoomTypes((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      setError(err.message || "Could not delete the room type");
    }
  };

  // =========================================================
  // RENT HISTORY
  // =========================================================
  const toggleHistory = async (t) => {
    if (historyId === t.id) return setHistoryId(null);
    setError("");

    try {
      const data = await getRentHistory(t.id);
      setHistory(data.history);
      setHistoryId(t.id);
    } catch (err) {
      setError(err.message || "Could not load rent history");
    }
  };

  const columns = isAdmin ? 7 : 6;

  return (
    <DashboardLayout title="Room Types & Rent">
      <div className="page-header">
        <div>
          <h1 className="page-title">Room Types & Rent</h1>
          <p className="page-subtitle">
            {roomTypes.length} room type{roomTypes.length === 1 ? "" : "s"} · AC / Non-AC,
            sharing, facilities and monthly rent
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setFormSuccess("");
              setShowForm((v) => !v);
            }}
          >
            {showForm ? "Close" : "+ Add Room Type"}
          </button>
        )}
      </div>

      {/* Add / Edit Room Type Form */}
      {isAdmin && showForm && (
        <form className="bento-card mb-6" onSubmit={handleSave}>
          <div className="card-header">
            <div>
              <div className="card-title">
                {editingId ? "Edit room type" : "Add a room type"}
              </div>
              <p className="card-text form-intro">
                A room type sets the sharing, facilities and rent package for every room of
                that type. Changing the rent keeps the old rate in the rent history.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Room Type Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Non-AC Triple"
              />
            </div>
            <div className="form-field">
              <label>Air Conditioning</label>
              <select
                className="form-select"
                value={isAc ? "ac" : "non-ac"}
                onChange={(e) => setIsAc(e.target.value === "ac")}
              >
                <option value="non-ac">Non-AC</option>
                <option value="ac">AC</option>
              </select>
            </div>
            <div className="form-field">
              <label>Sharing (beds per room)</label>
              <select
                className="form-select"
                value={sharingCapacity}
                onChange={(e) => setSharingCapacity(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Single (1 person)" : `${n}-sharing`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Monthly Rent (Rs)</label>
              <input
                type="number"
                min="0"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="form-field">
              <label>Security Deposit (Rs, optional)</label>
              <input
                type="number"
                min="0"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            <div className="form-field">
              <label>Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Corner rooms with window"
              />
            </div>
            <div className="form-field full">
              <label>Facilities</label>
              <div className="chip-group">
                {FACILITIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip ${facilities.includes(f) ? "active" : ""}`}
                    onClick={() => toggleFacility(f)}
                  >
                    {facilities.includes(f) ? "✓ " : ""}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="action-group">
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? "Saving..." : editingId ? "Save Changes" : "Add Room Type"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {formSuccess && <div className="form-success">{formSuccess}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* Room Types Table */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Room Type</th>
              <th>AC</th>
              <th>Sharing</th>
              <th>Facilities</th>
              <th>Rent Package</th>
              <th>Rooms</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns} className="table-empty">Loading room types...</td>
              </tr>
            ) : roomTypes.length === 0 ? (
              <tr>
                <td colSpan={columns} className="table-empty">
                  {isAdmin
                    ? 'No room types yet. Click "Add Room Type" to create the first one.'
                    : "No room types yet. The Admin sets these up."}
                </td>
              </tr>
            ) : (
              roomTypes.map((t) => (
                <Fragment key={t.id}>
                  <tr>
                    <td>
                      <div className="cell-title">{t.name}</div>
                      <div className="cell-sub">{t.description || "—"}</div>
                    </td>
                    <td>
                      <span className={`badge ${t.is_ac ? "cyan" : "amber"}`}>
                        {t.is_ac ? "AC" : "Non-AC"}
                      </span>
                    </td>
                    <td className="cell-muted">
                      {t.sharing_capacity === 1 ? "Single" : `${t.sharing_capacity}-sharing`}
                    </td>
                    <td className="cell-muted">
                      {t.facilities.length ? t.facilities.join(", ") : "—"}
                    </td>
                    <td>
                      <div className="cell-title">{formatRs(t.monthly_rate)} / month</div>
                      <div className="cell-sub">
                        Deposit {formatRs(t.security_deposit)} ·{" "}
                        <button className="link-btn" onClick={() => toggleHistory(t)}>
                          {historyId === t.id ? "Hide history" : "History"}
                        </button>
                      </div>
                    </td>
                    <td className="cell-muted">{t.room_count}</td>
                    {isAdmin && (
                      <td>
                        <div className="action-group">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(t)}
                            disabled={t.room_count > 0}
                            title={t.room_count > 0 ? "Rooms use this type" : undefined}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {historyId === t.id && (
                    <tr>
                      <td colSpan={columns} className="cell-muted">
                        <strong>Rent history:</strong>{" "}
                        {history
                          .map(
                            (h) =>
                              `${formatRs(h.monthly_rate)} from ${new Date(h.effective_from).toLocaleDateString("en-GB")}`
                          )
                          .join("  ·  ")}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
