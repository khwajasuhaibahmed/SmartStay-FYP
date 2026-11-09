import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { floorName, statusConfig } from "../constants/rooms";
import {
  addBed,
  createBranch,
  createFloor,
  createRoom,
  deleteBed,
  deleteBranch,
  deleteFloor,
  deleteRoom,
  getRoomTypes,
  getStructure,
  getUser,
  getUsers,
  setBedStatus,
  setRoomStatus,
  updateBranch,
  updateRoom,
} from "../services/api";
import { checkCity, checkPlaceName, checkRoomNumber } from "../utils/validation";

const STATUSES = Object.keys(statusConfig);

// Beds of a list of rooms, counted by status.
const countBeds = (rooms) => {
  const beds = rooms.flatMap((r) => r.beds);
  return { total: beds.length, free: beds.filter((b) => b.status === "available").length };
};

// =========================================================
// BRANCHES & ROOMS PAGE (Admin sets up · Admin + Warden update status)
// =========================================================
export default function Rooms() {
  const isAdmin = getUser()?.role === "admin";

  const [branches, setBranches] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Branch form
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [wardenId, setWardenId] = useState("");
  const [branchError, setBranchError] = useState("");

  // Floor form
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [floorNumber, setFloorNumber] = useState("0");
  const [floorLabel, setFloorLabel] = useState("");

  // Room form (one floor at a time) and room edit
  const [roomFloorId, setRoomFloorId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomError, setRoomError] = useState("");

  // The bed whose status panel is open
  const [selectedBedId, setSelectedBedId] = useState(null);

  const loadStructure = () =>
    getStructure()
      .then((data) => {
        setBranches(data.branches);
        setBranchId((current) =>
          data.branches.some((b) => b.id === current) ? current : data.branches[0]?.id || null
        );
      })
      .catch((err) => setError(err.message || "Could not load rooms"))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadStructure();
    getRoomTypes()
      .then((data) => setRoomTypes(data.roomTypes))
      .catch(() => setRoomTypes([]));
    if (isAdmin) {
      getUsers()
        .then((data) => setWardens(data.users.filter((u) => u.role === "warden" && u.is_active)))
        .catch(() => setWardens([]));
    }
  }, []);

  const branch = branches.find((b) => b.id === branchId);

  // Runs a change, shows its message or error, then reloads the rooms.
  const run = async (action, onDone) => {
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const data = await action();
      if (data?.message) setMessage(data.message);
      if (onDone) onDone(data);
      await loadStructure();
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // BRANCH: ADD / EDIT / DELETE
  // =========================================================
  const openBranchForm = (b) => {
    setEditingBranchId(b ? b.id : null);
    setBranchName(b ? b.name : "");
    setCity(b?.city || "");
    setAddress(b?.address || "");
    setWardenId(b?.warden_id ? String(b.warden_id) : "");
    setBranchError("");
    setShowBranchForm(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    setBranchError("");

    const fieldError = checkPlaceName(branchName, "Branch name") || checkCity(city);
    if (fieldError) return setBranchError(fieldError);

    const body = {
      name: branchName.trim(),
      city: city.trim(),
      address: address.trim(),
      wardenId: wardenId ? Number(wardenId) : null,
    };

    const ok = await run(
      () => (editingBranchId ? updateBranch(editingBranchId, body) : createBranch(body)),
      (data) => setBranchId(data.branch.id)
    );
    if (ok) setShowBranchForm(false);
  };

  const handleDeleteBranch = () => {
    if (
      !window.confirm(
        `Delete the branch "${branch.name}" with all its floors, rooms and beds?`
      )
    )
      return;
    run(() => deleteBranch(branch.id));
  };

  // =========================================================
  // FLOOR: ADD / DELETE
  // =========================================================
  const handleAddFloor = async (e) => {
    e.preventDefault();
    const ok = await run(() =>
      createFloor({
        branchId: branch.id,
        floorNumber: Number(floorNumber),
        label: floorLabel.trim(),
      })
    );
    if (ok) {
      setShowFloorForm(false);
      setFloorLabel("");
    }
  };

  const handleDeleteFloor = (floor) => {
    if (!window.confirm(`Delete ${floorName(floor)} with all its rooms and beds?`)) return;
    run(() => deleteFloor(floor.id));
  };

  // =========================================================
  // ROOM: ADD / EDIT / DELETE / STATUS
  // =========================================================
  const openRoomForm = (floorId, room) => {
    setRoomFloorId(room ? null : floorId);
    setEditingRoomId(room ? room.id : null);
    setRoomNumber(room ? room.room_number : "");
    setRoomTypeId(room ? String(room.room_type_id) : roomTypes[0] ? String(roomTypes[0].id) : "");
    setRoomError("");
  };

  const closeRoomForm = () => {
    setRoomFloorId(null);
    setEditingRoomId(null);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setRoomError("");

    const fieldError = checkRoomNumber(roomNumber) || (!roomTypeId ? "Please pick a room type" : "");
    if (fieldError) return setRoomError(fieldError);

    const body = { roomNumber: roomNumber.trim(), roomTypeId: Number(roomTypeId) };
    const ok = await run(() =>
      editingRoomId ? updateRoom(editingRoomId, body) : createRoom({ ...body, floorId: roomFloorId })
    );
    if (ok) closeRoomForm();
  };

  const handleDeleteRoom = (room) => {
    if (!window.confirm(`Delete room ${room.room_number} and its beds?`)) return;
    run(() => deleteRoom(room.id));
  };

  const handleRoomStatus = (room, status) => run(() => setRoomStatus(room.id, status));

  // =========================================================
  // BED: ADD / REMOVE / STATUS
  // =========================================================
  const handleBedStatus = async (bed, status) => {
    const ok = await run(() => setBedStatus(bed.id, status));
    if (ok) setSelectedBedId(null);
  };

  const handleDeleteBed = async (bed) => {
    const ok = await run(() => deleteBed(bed.id));
    if (ok) setSelectedBedId(null);
  };

  // Shared room form (add on a floor, or edit a room)
  const roomForm = (
    <form className="room-form" onSubmit={handleSaveRoom}>
      <div className="form-grid">
        <div className="form-field">
          <label>Room Number</label>
          <input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="e.g. 101 or G-04"
          />
        </div>
        <div className="form-field">
          <label>Room Type</label>
          <select
            className="form-select"
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
          >
            {roomTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.sharing_capacity} bed{t.sharing_capacity === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </div>
      </div>
      {roomError && <div className="form-error">{roomError}</div>}
      <div className="action-group">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {editingRoomId ? "Save Room" : "Add Room"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={closeRoomForm}>
          Cancel
        </button>
      </div>
    </form>
  );

  const branchRooms = branch ? branch.floors.flatMap((f) => f.rooms) : [];
  const branchBeds = countBeds(branchRooms);
  const pageTitle = isAdmin ? "Branches & Rooms" : "Rooms & Beds";

  return (
    <DashboardLayout title={pageTitle}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">
            {branches.length} branch{branches.length === 1 ? "" : "es"} ·{" "}
            {isAdmin
              ? "set up floors, rooms and beds, and track their status"
              : "track room and bed status"}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => (showBranchForm ? setShowBranchForm(false) : openBranchForm(null))}
          >
            {showBranchForm ? "Close" : "+ Add Branch"}
          </button>
        )}
      </div>

      {/* Add / Edit Branch Form */}
      {isAdmin && showBranchForm && (
        <form className="bento-card mb-6" onSubmit={handleSaveBranch}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingBranchId ? "Edit branch" : "Add a branch"}</div>
              <p className="card-text form-intro">
                A branch is one building of your hostel. Add its floors and rooms after
                saving it.
              </p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>Branch Name</label>
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Main Branch"
              />
            </div>
            <div className="form-field">
              <label>City (optional)</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
            </div>
            <div className="form-field">
              <label>Address (optional)</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Block 5, Gulshan-e-Iqbal"
              />
            </div>
            <div className="form-field">
              <label>Warden (optional)</label>
              <select
                className="form-select"
                value={wardenId}
                onChange={(e) => setWardenId(e.target.value)}
              >
                <option value="">No warden yet</option>
                {wardens.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {branchError && <div className="form-error">{branchError}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingBranchId ? "Save Branch" : "Add Branch"}
          </button>
        </form>
      )}

      {message && <div className="form-success">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="bento-card table-empty">Loading rooms...</div>
      ) : branches.length === 0 ? (
        <div className="bento-card table-empty">
          {isAdmin
            ? 'No branches yet. Click "Add Branch" to start.'
            : "No branches yet. The Admin sets these up."}
        </div>
      ) : (
        <>
          {/* Branch picker */}
          {branches.length > 1 && (
            <div className="toolbar">
              <div className="chip-group">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    className={`chip ${b.id === branchId ? "active" : ""}`}
                    onClick={() => setBranchId(b.id)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {branch && (
            <>
              {/* Branch card */}
              <div className="bento-card mb-6">
                <div className="card-header">
                  <div>
                    <div className="card-title">{branch.name}</div>
                    <p className="card-text">
                      {[branch.address, branch.city].filter(Boolean).join(", ") || "No address"} ·
                      Warden: {branch.warden_name || "not assigned"} · {branch.floors.length} floor
                      {branch.floors.length === 1 ? "" : "s"} · {branchRooms.length} room
                      {branchRooms.length === 1 ? "" : "s"} · {branchBeds.free} of {branchBeds.total} beds
                      available
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="action-group">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowFloorForm((v) => !v)}
                      >
                        {showFloorForm ? "Close" : "+ Add Floor"}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openBranchForm(branch)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={handleDeleteBranch} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Add Floor Form */}
                {isAdmin && showFloorForm && (
                  <form className="room-form" onSubmit={handleAddFloor}>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Floor</label>
                        <select
                          className="form-select"
                          value={floorNumber}
                          onChange={(e) => setFloorNumber(e.target.value)}
                        >
                          {Array.from({ length: 23 }, (_, i) => i - 2).map((n) => (
                            <option key={n} value={n}>
                              {floorName({ floor_number: n })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Label (optional)</label>
                        <input
                          value={floorLabel}
                          onChange={(e) => setFloorLabel(e.target.value)}
                          placeholder="e.g. Girls Wing"
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                      Add Floor
                    </button>
                  </form>
                )}

                {/* Status legend */}
                <div className="status-legend">
                  {STATUSES.map((s) => (
                    <span key={s} className={`badge ${statusConfig[s].className}`}>
                      <span className="dot" />
                      {statusConfig[s].label}
                    </span>
                  ))}
                </div>
              </div>

              {isAdmin && roomTypes.length === 0 && (
                <div className="form-error">
                  Add a room type first on <Link to="/room-types">Room Types & Rent</Link>, then
                  you can add rooms.
                </div>
              )}

              {branch.floors.length === 0 && (
                <div className="bento-card table-empty">
                  {isAdmin ? 'No floors yet. Click "Add Floor".' : "No floors yet."}
                </div>
              )}

              {/* Floors */}
              {branch.floors.map((floor) => {
                const beds = countBeds(floor.rooms);
                return (
                  <div key={floor.id} className="bento-card mb-6">
                    <div className="card-header">
                      <div>
                        <div className="card-title">{floorName(floor)}</div>
                        <p className="card-text">
                          {floor.rooms.length} room{floor.rooms.length === 1 ? "" : "s"} ·{" "}
                          {beds.free} of {beds.total} beds available
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="action-group">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => openRoomForm(floor.id, null)}
                            disabled={roomTypes.length === 0}
                          >
                            + Add Room
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteFloor(floor)}
                            disabled={busy}
                          >
                            Delete Floor
                          </button>
                        </div>
                      )}
                    </div>

                    {roomFloorId === floor.id && roomForm}

                    {floor.rooms.length === 0 ? (
                      <p className="card-text">No rooms on this floor yet.</p>
                    ) : (
                      <div className="room-grid">
                        {floor.rooms.map((room) => {
                          const selectedBed = room.beds.find((b) => b.id === selectedBedId);
                          return (
                            <div key={room.id} className="room-card">
                              {editingRoomId === room.id ? (
                                roomForm
                              ) : (
                                <>
                                  <div className="room-card-top">
                                    <div>
                                      <div className="cell-title">Room {room.room_number}</div>
                                      <div className="cell-sub">
                                        {room.room_type_name || "No type"} ·{" "}
                                        {room.is_ac ? "AC" : "Non-AC"}
                                      </div>
                                    </div>
                                    <span className={`badge ${statusConfig[room.status].className}`}>
                                      {statusConfig[room.status].label}
                                    </span>
                                  </div>

                                  {/* Beds */}
                                  <div className="bed-row">
                                    {room.beds.map((bed) => (
                                      <button
                                        key={bed.id}
                                        className={`bed-chip ${bed.status} ${bed.id === selectedBedId ? "selected" : ""}`}
                                        onClick={() =>
                                          setSelectedBedId(bed.id === selectedBedId ? null : bed.id)
                                        }
                                        title={`Bed ${bed.bed_label}: ${statusConfig[bed.status].label}`}
                                      >
                                        🛏 {bed.bed_label}
                                      </button>
                                    ))}
                                    {isAdmin && (
                                      <button
                                        className="bed-chip add"
                                        onClick={() => run(() => addBed(room.id))}
                                        disabled={busy || room.beds.length >= room.sharing_capacity}
                                        title={
                                          room.beds.length >= room.sharing_capacity
                                            ? "Room is at its sharing limit"
                                            : "Add a bed"
                                        }
                                      >
                                        + Bed
                                      </button>
                                    )}
                                  </div>

                                  {/* Bed status panel */}
                                  {selectedBed && (
                                    <div className="bed-panel">
                                      <div className="cell-sub">Bed {selectedBed.bed_label} status:</div>
                                      <div className="chip-group">
                                        {STATUSES.map((s) => (
                                          <button
                                            key={s}
                                            className={`chip ${selectedBed.status === s ? "active" : ""}`}
                                            onClick={() => handleBedStatus(selectedBed, s)}
                                            disabled={busy || selectedBed.status === s}
                                          >
                                            {statusConfig[s].label}
                                          </button>
                                        ))}
                                      </div>
                                      {isAdmin && (
                                        <button
                                          className="link-btn danger"
                                          onClick={() => handleDeleteBed(selectedBed)}
                                          disabled={busy}
                                        >
                                          Remove bed {selectedBed.bed_label}
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Room actions */}
                                  <div className="room-card-actions">
                                    <select
                                      className="select"
                                      value={room.status}
                                      onChange={(e) => handleRoomStatus(room, e.target.value)}
                                      disabled={busy}
                                    >
                                      {STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                          Room: {statusConfig[s].label}
                                        </option>
                                      ))}
                                    </select>
                                    {isAdmin && (
                                      <div className="action-group">
                                        <button
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => openRoomForm(null, room)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="btn btn-danger btn-sm"
                                          onClick={() => handleDeleteRoom(room)}
                                          disabled={busy}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
