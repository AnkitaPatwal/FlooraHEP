import "./AppLayout.css";
import "../main/Exercise.css";
import SideNav from "./SideNav";
import type { PropsWithChildren } from "react";

const AppLayout = ({ children }: PropsWithChildren) => (
  <div className="app-shell">
    <aside className="app-sidenav">
      <SideNav />
    </aside>
    <div className="app-content" role="main">
      {children}
    </div>
  </div>
);

export default AppLayout;