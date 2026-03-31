import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import "../layouts/SideNav.css";
import logo from "../../assets/flooraLogo.png";
import {
  FaTachometerAlt,
  FaUsers,
  FaClipboardList,
  FaCalendarAlt,
  FaDumbbell,
  FaUserCircle,
  FaEllipsisV,
  FaUserPlus,
  FaSignOutAlt,
} from "react-icons/fa";

const SideNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, isSuperAdmin, isAuthLoading } = useAuth();

  const usersActive =
    location.pathname === "/users" ||
    location.pathname === "/user-approval";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="sidenav">
      {/* Logo */}
      <div className="logo-container">
        <img src={logo} alt="Floora Logo" className="logo-img" />
      </div>
      <hr className="divider-top" />

      {/* Navigation */}
      <ul className="nav-list">
        <li>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FaTachometerAlt className="icon" /> Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/assign-package"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FaClipboardList className="icon" /> Assign Package
          </NavLink>
        </li>
        {!isAuthLoading && isSuperAdmin && (
          <li>
            <NavLink
              to="/create-admin"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <FaUserPlus className="icon" /> Create Admin
            </NavLink>
          </li>
        )}
        <li>
          <NavLink
            to="/users"
            end
            className={({ isActive }) =>
              `nav-item ${isActive || usersActive ? "active" : ""}`
            }
          >
            <FaUsers className="icon" /> Users
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/plan-dashboard"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FaClipboardList className="icon" /> Plans
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/sessions"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FaCalendarAlt className="icon" /> Sessions
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/exercise-dashboard"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <FaDumbbell className="icon" /> Exercises
          </NavLink>
        </li>
      </ul>

      <hr className="divider-bottom" />

      {/* Footer */}
      <div className="user-footer">
        <div className="user-info">
          <FaUserCircle className="user-icon" />
          <span className="username">
            {!isAuthLoading && (isSuperAdmin ? "Super Admin" : "Admin")}
          </span>
        </div>
          <button
            onClick={handleLogout}
            className="logout-btn"
            title="Log out"
          >
            <FaSignOutAlt />
          </button>
        </div>
    </div>
  );
};

export default SideNav;