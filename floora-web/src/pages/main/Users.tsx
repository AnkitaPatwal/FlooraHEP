// src/pages/main/Users.tsx
import AppLayout from "../../components/layouts/AppLayout";

export default function Users() {
  return (
    <AppLayout>
      <h1 className="user-title">Users!</h1>
      <h2 className="user-subtitle">204 active users</h2>
    </AppLayout>
  );
}






/*
import { useMemo, useState } from "react";
import AppLayout from "../../components/layouts/AppLayout";

type User = {
  id: string;
  name: string;
  status: "pending" | "active";
  plan?: string;        // e.g. "Leakage" or "No Plan"
  session?: string;     // e.g. "Session 2" or "No Session"
  avatarUrl?: string;   // optional; we’ll fall back to initials
};

const SEED_USERS: User[] = [
  // Pending
  { id: "p1", name: "Loretta Barry", status: "pending", plan: "No Plan", session: "No Session" },
  { id: "p2", name: "Loretta Barry", status: "pending", plan: "No Plan", session: "No Session" },
  // Active
  { id: "a1", name: "Catherine Becks", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a2", name: "Cindy Barlow", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a3", name: "Donna Paulsen", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a4", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a5", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a6", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a7", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
];

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name]
  );

  return url ? (
    <img src={url} alt={name} style={styles.avatarImg} />
  ) : (
    <div aria-hidden style={styles.avatarFallback}>
      {initials}
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardInner}>
        <div style={styles.avatarWrap}>
          <Avatar name={user.name} url={user.avatarUrl} />
        </div>
        <div style={styles.cardTextBlock}>
          <div style={styles.cardName}>{user.name}</div>
          <div style={styles.mutedLine}>{user.plan ?? "No Plan"}</div>
          <div style={styles.mutedLine}>{user.session ?? "No Session"}</div>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [q, setQ] = useState("");

  const pending = useMemo(
    () =>
      SEED_USERS.filter(
        (u) =>
          u.status === "pending" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q]
  );

  const active = useMemo(
    () =>
      SEED_USERS.filter(
        (u) =>
          u.status === "active" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q]
  );

  return (
    <div style={styles.appShell}>
      <AppLayout />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Users</h1>
            <div style={styles.subtitle}>{active.length} Active Users</div>
          </div>
          <button type="button" style={styles.newUserBtn}>
            + New User
          </button>
        </header>

        //pending
        <section aria-labelledby="pending-title" style={styles.section}>
          <h2 id="pending-title" style={styles.sectionTitle}>
            Pending Users
          </h2>
          <div style={styles.grid}>
            {pending.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
            {pending.length === 0 && (
              <div style={styles.emptyState}>No pending users</div>
            )}
          </div>
        </section>

        // Search 
        <div style={styles.searchRow}>
          <div style={styles.searchWrap}>
            <span aria-hidden style={styles.searchIcon}>🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              style={styles.searchInput}
            />
          </div>
        </div>

        Active
        <section aria-labelledby="active-title" style={styles.sectionLast}>
          <h2 id="active-title" style={styles.sectionTitle}>
            Active Users
          </h2>
          <div style={styles.grid}>
            {active.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
            {active.length === 0 && (
              <div style={styles.emptyState}>No active users</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const palette = {
  bg: "#f7eee8",
  panel: "#ffffff",
  text: "#2a2a2a",
  subtext: "#7c7c7c",
  line: "rgba(0,0,0,0.06)",
  btn: "#2c8b80",
  btnText: "#ffffff",
};

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    minHeight: "100vh",
    background: palette.bg,
  },
  main: {
    padding: "28px 28px 60px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  h1: { margin: 0, fontSize: 28, lineHeight: 1.1, color: palette.text },
  subtitle: { marginTop: 6, color: palette.subtext, fontSize: 14 },
  newUserBtn: {
    background: palette.btn,
    color: palette.btnText,
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  },
  section: { marginTop: 6, marginBottom: 22 },
  sectionLast: { marginTop: 6 },
  sectionTitle: {
    fontSize: 16,
    color: palette.text,
    margin: "12px 0",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 18,
  },
  card: {
    background: palette.panel,
    borderRadius: 14,
    border: `1px solid ${palette.line}`,
    boxShadow: "0 3px 16px rgba(0,0,0,0.06)",
    height: 190,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform .08s ease, box-shadow .12s ease",
  },
  cardInner: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
  },
  avatarWrap: { display: "grid", placeItems: "center" },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    objectFit: "cover",
    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#e9f2f1",
    color: "#3b756e",
    fontWeight: 700,
    fontSize: 22,
    border: "1px solid rgba(0,0,0,0.05)",
  },
  cardTextBlock: {
    textAlign: "center",
  },
  cardName: {
    fontWeight: 700,
    color: palette.text,
    marginBottom: 4,
  },
  mutedLine: {
    fontSize: 12,
    color: palette.subtext,
    lineHeight: 1.2,
  },
  searchRow: {
    display: "flex",
    justifyContent: "flex-start",
    margin: "10px 0 18px",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: palette.panel,
    borderRadius: 10,
    padding: "8px 10px",
    border: `1px solid ${palette.line}`,
    minWidth: 260,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  searchIcon: { opacity: 0.6 },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    width: 220,
  },
  emptyState: {
    gridColumn: "1 / -1",
    opacity: 0.6,
    padding: "14px 0",
    textAlign: "center",
  },
};
*/