import type { CSSProperties } from "react";

/** Outer shell for patient plan / session editing screens */
export const patientEditingPageStyle: CSSProperties = {
  padding: "24px",
  maxWidth: 640,
  boxSizing: "border-box",
};

/** @deprecated Prefer AssignBackLink + assignBackButton.module.css */
export const tealOutlineLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "8px 18px",
  borderRadius: 10,
  border: "1px solid #5f8c8f",
  background: "#fff",
  color: "#5f8c8f",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  fontFamily: "inherit",
  lineHeight: 1.2,
};

export const listColumnStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export const sectionDividerStyle: CSSProperties = {
  paddingTop: 8,
  borderTop: "1px solid rgba(0,0,0,0.1)",
};

export const dangerButtonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid rgba(180,40,40,0.45)",
  background: "#fff",
  color: "#b22222",
  fontSize: 14,
  cursor: "pointer",
};
