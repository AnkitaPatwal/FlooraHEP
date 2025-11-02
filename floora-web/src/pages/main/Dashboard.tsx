// src/pages/main/Dashboard.tsx
import AppLayout from "../../components/layouts/AppLayout";
//import "../../components/main/Dashboard.css";

export default function Dashboard() {
  return (
    <AppLayout>
      <h1 className="dashboard-title">Dashboard!</h1>
      <h2 className="dashboard-subtitle">204 active users</h2>
    </AppLayout>
  );
}
