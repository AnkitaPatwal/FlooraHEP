import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import "../layouts/SideNav.css";
import logo from "../../assets/flooraLogo.png";
import { UserPlus, UserCircle2, LogOut } from "lucide-react";

const MenuShapeIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`menu-shape-icon ${active ? "active" : ""}`}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top bar (thicker like Figma) */}
    <rect x="4" y="4" width="20" height="7" rx="2.5" />

    {/* Bottom left (slightly bigger) */}
    <rect x="4" y="16" width="8" height="8" rx="2.5" />

    {/* Bottom right */}
    <rect x="16" y="16" width="8" height="8" rx="2.5" />
  </svg>
);

const SideNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, isAuthLoading } = useAuth();

  const usersActive =
    location.pathname === "/users" ||
    location.pathname === "/user-approval";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="sidenav">
      <div>
        <div className="logo-container">
          <img src={logo} alt="Floora Logo" className="logo-img" />
        </div>

        <hr className="divider-top" />

        <ul className="nav-list">
          <li>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive} />
                  <span>Dashboard</span>
                </>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/users"
              end
              className={({ isActive }) =>
                `nav-item ${isActive || usersActive ? "active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive || usersActive} />
                  <span>Users</span>
                </>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/plan-dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive} />
                  <span>Plans</span>
                </>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/sessions"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive} />
                  <span>Sessions</span>
                </>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/exercise-dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive} />
                  <span>Exercises</span>
                </>
              )}
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/assign-package"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuShapeIcon active={isActive} />
                  <span>Assign Plans</span>
                </>
              )}
            </NavLink>
          </li>

          {!isAuthLoading && isSuperAdmin && (
            <li>
              <NavLink
                to="/create-admin"
                end
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <UserPlus className="icon" strokeWidth={2.2} />
                <span>Create Admin</span>
              </NavLink>
            </li>
          )}
        </ul>
      </div>

      <div>
        <hr className="divider-bottom" />

        <div className="user-footer">
          <div className="user-info">
            <UserCircle2 className="user-icon" strokeWidth={2} />
            <span className="username">
              {!isAuthLoading && (isSuperAdmin ? "Super Admin" : "Admin")}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="logout-btn"
            title="Log out"
          >
            <LogOut />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideNav;