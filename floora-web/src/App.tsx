import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import AdminLogin from "./pages/AdminLogin";
import "./App.css";
import ExerciseDashboard from "./pages/ExerciseDashboard";
import Dashboard from "./pages/Dashboard";
import EditUserApprove from "./pages/EditUserApprove";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/create" element={<CreateAccount />} />
        <Route path="/dashboard" element={<ExerciseDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exercise-dashboard" element={<ExerciseDashboard />} />
        <Route path="/edit-user-approve" element={<EditUserApprove />} />
      </Routes>
    </Router>
  );
}




