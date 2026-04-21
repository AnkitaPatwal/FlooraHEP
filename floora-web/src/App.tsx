import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AdminVideoUpload from "./pages/AdminVideoUpload";
import { AuthProvider } from "./lib/auth";
import "./App.css";
import CreateAccount from "./pages/CreateAccount";
import AdminLogin from "./pages/AdminLogin";
import Users from "./pages/main/Users";
import ExerciseDashboard from "./pages/main/Exercise";
import Dashboard from "./pages/main/Dashboard";
import UserApproval from "./pages/UserApproval";
import DeniedUserDetail from "./pages/DeniedUserDetail";
import UserProfile from "./pages/UserProfile";
import UserAssignedSession from "./pages/UserAssignedSession";
import ForgotPassword from "./pages/ForgotPassword";
import PlanDashboard from "./pages/main/Plan";
import SessionDashboard from "./pages/main/Session";
import CreateSession from "./pages/main/CreateSession";
import SessionDetail from "./pages/main/SessionDetail";
import CreateExercise from "./components/main/CreateExercise";
import EditExercise from "./components/main/EditExercise";
import ExerciseDetail from "./pages/main/ExerciseDetail";
import AdminRegister from "./pages/AdminRegister";
import CreateAdmin from "./pages/CreateAdmin";
import AdminAcceptInvite from "./pages/AdminAcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import CreatePlan from "./pages/main/CreatePlan";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { AdminRoute } from "./components/AdminRoute";
import AppLayout from "./components/layouts/AppLayout";

function AuthRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      navigate("/reset-password" + hash, { replace: true });
    }
    if (hash.includes("type=invite")) {
      navigate("/admin-accept-invite" + hash, { replace: true });
    }
  }, []);

  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthRedirectHandler />
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/create" element={<CreateAccount />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/users" element={<Users />} />
          <Route path="/plan-dashboard" element={<PlanDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/plan-dashboard/create" element={
            <AdminRoute>
              <CreatePlan />
            </AdminRoute>
          } />
          <Route
            path="/plan-dashboard/:id"
            element={<Navigate to="/plan-dashboard/:id/edit" replace />}
          />
          <Route path="/plan-dashboard/:id/edit" element={
            <AdminRoute>
              <CreatePlan />
            </AdminRoute>
          } />
          <Route path="/sessions" element={<SessionDashboard />} />
          <Route path="/sessions/create" element={<CreateSession />} />
          <Route path="/sessions/:id/edit" element={<CreateSession />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/exercise-dashboard" element={<ExerciseDashboard />} />
          <Route
            path="/exercises/create"
            element={
              <SuperAdminRoute fallbackTo="/exercise-dashboard">
                <CreateExercise />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/exercises/:id/edit"
            element={
              <SuperAdminRoute fallbackTo={(p) => (p?.id ? `/exercises/${p.id}` : "/exercise-dashboard")}>
                <EditExercise />
              </SuperAdminRoute>
            }
          />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/user-approval" element={<UserApproval />} />
          <Route path="/denied-user" element={<DeniedUserDetail />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route
            path="/users/:userId/assignment/:assignmentId/session/:moduleId"
            element={<UserAssignedSession />}
          />
          <Route path="/assign-package/*" element={<Navigate to="/users" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/admin/video-upload" element={<AdminVideoUpload />} />
          <Route path="/admin-accept-invite" element={<AdminAcceptInvite />} />
          <Route
            path="/create-admin"
            element={
              <SuperAdminRoute fallbackTo="/dashboard">
                <AppLayout>
                  <CreateAdmin />
                </AppLayout>
              </SuperAdminRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}