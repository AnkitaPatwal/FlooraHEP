import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import "../layouts/SideNav.css";
import logo from "../../assets/flooraLogo.png";

import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  Dumbbell,
  UserPlus,
  UserCircle2,
  MoreVertical,
  LogOut,
} from "lucide-react";

type MenuIconProps = {
  active: boolean;
  type: "dashboard" | "users" | "plans" | "sessions" | "exercises";
};

const MenuIcon = ({ active, type }: MenuIconProps) => {
  const className = `menu-nav-icon ${active ? "active" : ""}`;

  const props = {
    className,
    strokeWidth: active ? 2.6 : 2.2,
  };

  switch (type) {
    case "dashboard":
      return <LayoutDashboard {...props} />;
    case "users":
      return <Users {...props} />;
    case "plans":
      return <ClipboardList {...props} />;
    case "sessions":
      return <Activity {...props} />;
    case "exercises":
      return <Dumbbell {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
};

const SideNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const [footerMenuOpen, setFooterMenuOpen] = useState(false);
  const footerMenuRef = useRef<HTMLDivElement>(null);

  const usersActive =
    location.pathname === "/users" ||
    location.pathname === "/user-approval";

  const handleLogout = async () => {
    setFooterMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  useEffect(() => {
    if (!footerMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!footerMenuRef.current?.contains(e.target as Node)) {
        setFooterMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFooterMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [footerMenuOpen]);

  return (
    <div className="sidenav">
      <div>
        <div className="logo-container">
          <img src={logo} alt="Floora Logo" className="logo-img" />
        </div>

        <hr className="divider-top" />

        <ul className="nav-list">
          {/* Dashboard */}
          <li>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuIcon type="dashboard" active={isActive} />
                  <span>Dashboard</span>
                </>
              )}
            </NavLink>
          </li>

          {/* Users */}
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
                  <MenuIcon type="users" active={isActive || usersActive} />
                  <span>Users</span>
                </>
              )}
            </NavLink>
          </li>

          {/* Plans */}
          <li>
            <NavLink
              to="/plan-dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuIcon type="plans" active={isActive} />
                  <span>Plans</span>
                </>
              )}
            </NavLink>
          </li>

          {/* Sessions */}
          <li>
            <NavLink
              to="/sessions"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuIcon type="sessions" active={isActive} />
                  <span>Sessions</span>
                </>
              )}
            </NavLink>
          </li>

          {/* Exercises */}
          <li>
            <NavLink
              to="/exercise-dashboard"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <MenuIcon type="exercises" active={isActive} />
                  <span>Exercises</span>
                </>
              )}
            </NavLink>
          </li>

          {/* Create Admin (Super Admin only) */}
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

      {/* Footer */}
      <div>
        <hr className="divider-bottom" />

        <div className="user-footer">
          <div className="user-info">
            <UserCircle2 className="user-icon" strokeWidth={2} />
            <span className="username">
              {!isAuthLoading && (isSuperAdmin ? "Super Admin" : "Admin")}
            </span>
          </div>

          <div className="footer-menu-wrap" ref={footerMenuRef}>
            <button
              type="button"
              className="footer-menu-trigger"
              aria-expanded={footerMenuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              onClick={() => setFooterMenuOpen((o) => !o)}
            >
              <MoreVertical className="footer-menu-icon" strokeWidth={2.2} />
            </button>
            {footerMenuOpen ? (
              <div className="footer-menu-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="footer-menu-item footer-menu-item-signout"
                  onClick={() => {
                    void handleLogout();
                  }}
                >
                  <LogOut className="footer-menu-signout-icon" strokeWidth={2} aria-hidden />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideNav;