import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminVideoUpload from "./pages/AdminVideoUpload";

//import Login from "./pages/Login";
import { AuthProvider } from "./lib/auth";
import "./App.css";

import AssignPackage from "./pages/AssignPackage";
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
import CreateSession from "./pages/main/CreateSession";
import CreateExercise from "./components/main/CreateExercise";
import EditExercise from "./components/main/EditExercise";
import ExerciseDetail from "./pages/main/ExerciseDetail";
import AdminRegister from "./pages/AdminRegister";
import CreateAdmin from "./pages/CreateAdmin";
import { SuperAdminRoute } from "./components/SuperAdminRoute";

import AppLayout from "./components/layouts/AppLayout";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/create" element={<CreateAccount />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/users" element={<Users />} />
        <Route path="/plan-dashboard" element={<PlanDashboard />} />
        <Route path="/sessions" element={<SessionDashboard />} />
        <Route path="/sessions/create" element={<CreateSession />} />
        <Route path="/sessions/:id/edit" element={<CreateSession />} />
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
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/admin/video-upload" element={<AdminVideoUpload />} />

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

        <Route
          path="/assign-package"
          element={
            <AppLayout>
              <AssignPackage />
            </AppLayout>
          }
        />
        </Routes>
      </AuthProvider>
    </Router>
  );
}