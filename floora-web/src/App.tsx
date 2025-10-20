import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
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
      </Routes>
    </Router>
  );
}
