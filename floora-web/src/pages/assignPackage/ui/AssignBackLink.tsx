import { Link, type LinkProps } from "react-router-dom";
import styles from "./assignBackButton.module.css";

export function AssignBackLink({ className = "", ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={[styles.link, className].filter(Boolean).join(" ")}
    />
  );
}

export function AssignBackDivider() {
  return <span className={styles.divider} aria-hidden />;
}
