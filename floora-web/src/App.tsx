import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import Login from "./pages/Login";
import "./App.css";

import CreateAccount from "./pages/CreateAccount";
import AdminLogin from "./pages/AdminLogin";
import Users from "./pages/main/Users";
import ExerciseDashboard from "./pages/main/Exercise";
import Dashboard from "./pages/main/Dashboard";
import UserApproval from "./pages/UserApproval";
import UserProfile from "./pages/UserProfile";
import ForgotPassword from "./pages/ForgotPassword";
import PlanDashboard from "./pages/main/Plan";
import SessionDashboard from "./pages/main/Session";
import CreateExercise from "./components/main/CreateExercise";
import AdminRegister from "./pages/AdminRegister";
import CreateAdmin from "./pages/CreateAdmin";

import AppLayout from "./components/layouts/AppLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/create" element={<CreateAccount />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/users" element={<Users />} />
        <Route path="/plan-dashboard" element={<PlanDashboard />} />
        <Route path="/sessions" element={<SessionDashboard />} />
        <Route path="/exercise-dashboard" element={<ExerciseDashboard />} />
        <Route path="/exercises/create" element={<CreateExercise />} />
        <Route path="/user-approval" element={<UserApproval />} />
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin-register" element={<AdminRegister />} />

        {/* ✅ ONLY this route gets the sidebar layout */}
        <Route
          path="/create-admin"
          element={
            <AppLayout>
              <CreateAdmin />
            </AppLayout>
          }
        />
      </Routes>
    </Router>
  );
}