import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Exercise.css";
import { useState } from "react";
import exerciseImg from "../../assets/exercise.jpg"; 
import { Link } from "react-router-dom";

interface Exercise {
  id: number;
  category: string;
  title: string;
  type: string;
  image: string;
}

function ExerciseDashboard() {
  const [exercises] = useState<Exercise[]>([
    // Abductors - 4 exercises
    { id: 1, category: "Abductors", title: "Hip Abduction", type: "12 Active Users", image: exerciseImg },
    { id: 2, category: "Abductors", title: "Side Leg Raises", type: "8 Active Users", image: exerciseImg },
    { id: 3, category: "Abductors", title: "Clamshells", type: "15 Active Users", image: exerciseImg },
    { id: 4, category: "Abductors", title: "Lateral Band Walks", type: "6 Active Users", image: exerciseImg },
    
    // Back Pain - 4 exercises
    { id: 5, category: "Back Pain", title: "Cat-Cow Stretch", type: "18 Active Users", image: exerciseImg },
    { id: 6, category: "Back Pain", title: "Child's Pose", type: "14 Active Users", image: exerciseImg },
    { id: 7, category: "Back Pain", title: "Bridge Pose", type: "9 Active Users", image: exerciseImg },
    { id: 8, category: "Back Pain", title: "Knee-to-Chest", type: "11 Active Users", image: exerciseImg },
    
    // Core Strength - 4 exercises
    { id: 9, category: "Core Strength", title: "Plank Hold", type: "22 Active Users", image: exerciseImg },
    { id: 10, category: "Core Strength", title: "Russian Twists", type: "16 Active Users", image: exerciseImg },
    { id: 11, category: "Core Strength", title: "Leg Raises", type: "13 Active Users", image: exerciseImg },
    { id: 12, category: "Core Strength", title: "Bicycle Crunches", type: "19 Active Users", image: exerciseImg },
    
    // Lower Body - 4 exercises
    { id: 13, category: "Lower Body", title: "Bodyweight Squats", type: "25 Active Users", image: exerciseImg },
    { id: 14, category: "Lower Body", title: "Lunges", type: "17 Active Users", image: exerciseImg },
    { id: 15, category: "Lower Body", title: "Glute Bridges", type: "20 Active Users", image: exerciseImg },
    { id: 16, category: "Lower Body", title: "Calf Raises", type: "10 Active Users", image: exerciseImg },
  ]);

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) acc[exercise.category] = [];
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <AppLayout>
      <div className="exercise-page">
        {/* ==== HEADER ==== */}
        <header className="exercise-header">
          <div className="exercise-header-left">
            <h1 className="exercise-title">Exercises</h1>
            <p className="exercise-count">{exercises.length} Exercises</p>
            <Link to="/exercises/create">
              <button className="new-exercise-btn">+ New Exercise</button>
            </Link>
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
      </div>
    </AppLayout>
  );
}

export default ExerciseDashboard;