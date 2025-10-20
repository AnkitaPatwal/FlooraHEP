import "./SideNav.css";
import logo from "../assets/flooraLogo.png"; 
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
  return (
    <div className="sidenav">
      {/* Logo */}
      <div className="logo-container">
        <img src={logo} alt="Floora Logo" className="logo-img" />
      </div>
      <hr className="divider-top" />

      {/* Navigation */}
      <ul className="nav-list">
        <li className="nav-item">
          <FaTachometerAlt className="icon" /> Dashboard
        </li>
        <li className="nav-item">
          <FaUsers className="icon" /> Users
        </li>
        <li className="nav-item">
          <FaClipboardList className="icon" /> Plans
        </li>
        <li className="nav-item">
          <FaCalendarAlt className="icon" /> Sessions
        </li>
        <li className="nav-item active">
          <FaDumbbell className="icon" /> Exercises
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
