import "./AppLayout.css";
import "../main/Exercise.css"; // <-- adjust this relative path so it resolves here
import SideNav from "./SideNav";
import type { PropsWithChildren } from "react";

const AppLayout = ({ children }: PropsWithChildren) => (
  <div className="app-shell">
    <aside className="app-sidenav"><SideNav /></aside>
    <div className="app-content" role="main">{children}</div>
  </div>
);

export default AppLayout;
