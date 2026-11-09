import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { floorName } from "../constants/rooms";
import { getAvailability } from "../services/api";

// =========================================================
// FLOOR-WISE ROOM & BED AVAILABILITY PAGE (Admin + Warden)
// =========================================================
export default function Availability() {
  const [floors, setFloors] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvailability()
      .then((data) => setFloors(data.floors))
      .catch((err) => setError(err.message || "Could not load availability"))
      .finally(() => setLoading(false));
  }, []);

  // One chip per branch
  const branches = floors.reduce(
    (list, f) =>
      list.some((b) => b.id === f.branch_id)
        ? list
        : [...list, { id: f.branch_id, name: f.branch_name }],
    []
  );

  const shown =
    branchFilter === "all" ? floors : floors.filter((f) => f.branch_id === branchFilter);

  const total = (key) => shown.reduce((sum, f) => sum + f[key], 0);

  const kpis = [
    { title: "Total Beds", value: total("beds"), icon: "🛏️", color: "blue" },
    { title: "Available", value: total("available"), icon: "✅", color: "emerald" },
    { title: "Occupied", value: total("occupied"), icon: "👤", color: "cyan" },
    { title: "Reserved", value: total("reserved"), icon: "📌", color: "amber" },
    { title: "Under Maintenance", value: total("maintenance"), icon: "🔧", color: "rose" },
  ];

  return (
    <DashboardLayout title="Availability">
      <div className="page-header">
        <div>
          <h1 className="page-title">Room & Bed Availability</h1>
          <p className="page-subtitle">
            Floor-wise view · {total("rooms")} room{total("rooms") === 1 ? "" : "s"} on{" "}
            {shown.length} floor{shown.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.title} className="kpi">
            <div className="kpi-top">
              <div className="kpi-title">{k.title}</div>
              <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
            </div>
            <div className="kpi-value">{loading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      {branches.length > 1 && (
        <div className="toolbar">
          <div className="chip-group">
            <button
              className={`chip ${branchFilter === "all" ? "active" : ""}`}
              onClick={() => setBranchFilter("all")}
            >
              All branches
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                className={`chip ${branchFilter === b.id ? "active" : ""}`}
                onClick={() => setBranchFilter(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* Floor-wise Table */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Floor</th>
              <th>Rooms</th>
              <th>Beds</th>
              <th>Available</th>
              <th>Occupied</th>
              <th>Reserved</th>
              <th>Maintenance</th>
              <th>Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="table-empty">Loading availability...</td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  No floors yet. Add branches and floors on Branches & Rooms.
                </td>
              </tr>
            ) : (
              shown.map((f) => {
                const occupancy = f.beds ? Math.round((f.occupied / f.beds) * 100) : 0;
                return (
                  <tr key={f.floor_id}>
                    <td>
                      <div className="cell-title">
                        {floorName({ label: f.floor_label, floor_number: f.floor_number })}
                      </div>
                      <div className="cell-sub">{f.branch_name}</div>
                    </td>
                    <td className="cell-muted">{f.rooms}</td>
                    <td className="cell-muted">{f.beds}</td>
                    <td>
                      <span className="badge green">{f.available}</span>
                    </td>
                    <td>
                      <span className="badge indigo">{f.occupied}</span>
                    </td>
                    <td>
                      <span className="badge amber">{f.reserved}</span>
                    </td>
                    <td>
                      <span className="badge red">{f.maintenance}</span>
                    </td>
                    <td>
                      <div className="occupancy">
                        <div className="occupancy-bar">
                          <div className="occupancy-fill" style={{ width: `${occupancy}%` }} />
                        </div>
                        <span className="cell-sub">{occupancy}%</span>
                      </div>
                    </td>
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
