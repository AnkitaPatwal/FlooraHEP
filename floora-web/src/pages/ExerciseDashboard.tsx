import SideNav from "../components/SideNav";

function ExerciseDashboard() {
  return (
    <div style={{ display: "flex" }}>
      <SideNav />
      <div style={{ marginLeft: "220px", padding: "20px", width: "100%" }}>
        <h1>Exercise Dashboard</h1>
      </div>
    </div>
  );
}

export default ExerciseDashboard;
