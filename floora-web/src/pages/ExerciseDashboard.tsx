import SideNav from "../components/SideNav";
import "./ExerciseDashboard.css";
import { useState } from "react";
import exerciseImg from "../assets/exercise.jpg"; 

interface Exercise {
  id: number;
  category: string;
  title: string;
  type: string;
  image: string;
}

function ExerciseDashboard() {
 
  const [exercises] = useState<Exercise[]>([
    { id: 1, category: "Abductors", title: "Exercise Title", type: "12 Active Users", image: exerciseImg },
    { id: 2, category: "Abductors", title: "Exercise Title", type: "12 Active Users", image: exerciseImg },
    { id: 3, category: "Abductors", title: "Exercise Title", type: "12 Active Users", image: exerciseImg },
    { id: 4, category: "Abductors", title: "Exercise Title", type: "12 Active Users", image: exerciseImg },
    { id: 5, category: "Back Pain", title: "Exercise Title", type: "8 Active Users", image: exerciseImg },
    { id: 6, category: "Back Pain", title: "Exercise Title", type: "8 Active Users", image: exerciseImg },
    { id: 7, category: "Back Pain", title: "Exercise Title", type: "8 Active Users", image: exerciseImg },
    { id: 8, category: "Back Pain", title: "Exercise Title", type: "8 Active Users", image: exerciseImg },
  ]);

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) acc[exercise.category] = [];
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="dashboard-container">
      <SideNav />
      <main className="exercise-page">
        {/* ==== HEADER ==== */}
        <header className="exercise-header">
          <div className="exercise-header-left">
            <h1 className="exercise-title">Exercises</h1>
            <p className="exercise-count">64 Exercises</p>
            <button className="new-exercise-btn">+ New Exercise</button>
          </div>

          {/* SEARCH BAR SECTION */}
          <div className="exercise-header-right">
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
              <input
                type="text"
                className="search-bar"
                placeholder="Search"
              />
            </div>
          </div>
        </header>

        <hr className="divider" />

        {/* ==== EXERCISE CARDS ==== */}
        {Object.entries(groupedExercises).map(([category, items]) => (
          <section className="category-section" key={category}>
            <h2 className="category-title">
              {category} <span>{items.length} Exercises</span>
            </h2>

            <div className="exercise-grid">
              {items.map((exercise) => (
                <div className="exercise-card" key={exercise.id}>
                  <img
                    src={exercise.image}
                    alt={exercise.title}
                    className="exercise-image"
                  />
                  <div className="exercise-info">
                    <h3>{exercise.title}</h3>
                    <p>{exercise.category}</p>
                    <span className="exercise-tag">{exercise.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export default ExerciseDashboard;
