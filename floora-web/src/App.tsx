import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import AdminLogin from "./pages/AdminLogin";
import "./App.css";
import ExerciseDashboard from "./pages/ExerciseDashboard";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/create" element={<CreateAccount />} />
        <Route path="/dashboard" element={<ExerciseDashboard />} />
        <Route path="/dashboard" element={<ExerciseDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </Router>
  );
}




