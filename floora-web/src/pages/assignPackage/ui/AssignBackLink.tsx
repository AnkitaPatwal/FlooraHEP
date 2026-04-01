import { Link, type LinkProps } from "react-router-dom";
import styles from "./assignBackButton.module.css";

export type AssignBackLinkProps = LinkProps & {
  /** outline = bordered ghost; primary = solid teal (same as Add plan) */
  appearance?: "outline" | "primary";
};

export function AssignBackLink({
  className = "",
  appearance = "outline",
  ...props
}: AssignBackLinkProps) {
  const base = appearance === "primary" ? "" : styles.link;
  return (
    <Link
      {...props}
      className={[base, className].filter(Boolean).join(" ")}
    />
  );
}

export function AssignBackDivider() {
  return <span className={styles.divider} aria-hidden />;
}
