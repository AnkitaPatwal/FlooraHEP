export default function EditUserApprove() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Edit User</h1>
      <p>This is a minimal page.</p>

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12, color: "#555" }}>Name</label>
          <input value="Loretta Barry" readOnly style={{ padding: 8, width: 280 }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12, color: "#555" }}>Email</label>
          <input value="loretta@floora-pt.com" readOnly style={{ padding: 8, width: 280 }} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555" }}>Password</label>
          <input value="password123" readOnly type="password" style={{ padding: 8, width: 280 }} />
        </div>
      </div>
    </div>
  );
}