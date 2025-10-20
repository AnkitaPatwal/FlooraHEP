import SideNav from "../components/SideNav";
import "../components/Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <SideNav />
      <div className="dashboard-content">
        <h1 className="dashboard-title">Dashboard</h1>
        <h2 className="dashboard-subtitle">204 active users</h2>
      </div>
    </div>
  );
}
