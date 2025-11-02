import { NavLink, useLocation } from "react-router-dom";
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
} from "react-icons/fa";

const SideNav = () => {
  const location = useLocation();
  const usersActive =
    location.pathname === "/users" || location.pathname === "/user-approval";

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
            to="/users"
            className={({ isActive }) =>
              `nav-item ${isActive || usersActive ? "active" : ""}`
            }
          >
            <FaUsers className="icon" /> Users
          </NavLink>
        </li>
        <li>
          <NavLink to="/plan-dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FaClipboardList className="icon" /> Plans
          </NavLink>
        </li>
        <li>
          <NavLink to="/sessions" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FaCalendarAlt className="icon" /> Sessions
          </NavLink>
        </li>
        <li>
          <NavLink to="/exercise-dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FaDumbbell className="icon" /> Exercises
          </NavLink>
        </li>
      </ul>

      <hr className="divider-bottom" />

      {/* Footer */}
      <div className="user-footer">
        <div className="user-info">
          <FaUserCircle className="user-icon" />
          <span className="username">Admin user</span>
        </div>
        <FaEllipsisV className="menu-dots" />
      </div>
    </div>
  );
};

export default SideNav;
