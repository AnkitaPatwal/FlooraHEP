import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Session.css"; 
import { useState } from "react";
import sessionImg from "../../assets/exercise.jpg";
import { Link } from "react-router-dom";

interface SessionItem {
  id: number;
  category: string;
  title: string;
  type: string;
  image: string;
}

function Session() {
  const [sessions] = useState<SessionItem[]>([
    { id: 1, category: "Back Pain", title: "Lower Back Mobility", type: "12 Active Users", image: sessionImg },
    { id: 2, category: "Back Pain", title: "Gentle Stretch", type: "8 Active Users", image: sessionImg },
    { id: 3, category: "Back Pain", title: "Relax & Release", type: "15 Active Users", image: sessionImg },
    { id: 4, category: "DRA", title: "Core Alignment", type: "22 Active Users", image: sessionImg },
    { id: 5, category: "DRA", title: "Pelvic Stability", type: "16 Active Users", image: sessionImg },
  ]);

  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.category]) acc[session.category] = [];
    acc[session.category].push(session);
    return acc;
  }, {} as Record<string, SessionItem[]>);

  return (
    <AppLayout>
      <div className="session-page">
        {/* ==== HEADER ==== */}
        <header className="session-header">
          <div className="session-header-left">
            <h1 className="session-title">Sessions</h1>
            <p className="session-count">{sessions.length} Sessions</p>
            <Link to="/sessions/create">
              <button className="new-session-btn">+ New Session</button>
            </Link>
          </div>

          {/* SEARCH BAR SECTION */}
          <div className="session-header-right">
            <div className="search-wrapper">
              <span className="search-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                  />
                </svg>
              </span>
              <input type="text" className="search-bar" placeholder="Search" />
            </div>
          </div>
        </header>

        <hr className="divider" />

        {/* ==== SESSION CARDS ==== */}
        {Object.entries(groupedSessions).map(([category, items]) => (
          <section className="category-section" key={category}>
            <h2 className="category-title">
              {category} <span>{items.length} Sessions</span>
            </h2>

            <div className="session-grid">
              {items.map((session) => (
                <div className="session-card" key={session.id}>
                  <img
                    src={session.image}
                    alt={session.title}
                    className="session-image"
                  />
                  <div className="session-info">
                    <h3>{session.title}</h3>
                    <p>{session.category}</p>
                    <span className="session-tag">{session.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}

export default Session;
