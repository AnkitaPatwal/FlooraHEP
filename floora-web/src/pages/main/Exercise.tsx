import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Exercise.css";
import { useRef, useState } from "react";
import exerciseImg from "../../assets/exercise.jpg";
import { Link } from "react-router-dom";

interface Exercise {
  id: number;
  category: string;
  title: string;
  type: string;
  image: string;
  videoUrl?: string;
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
    {
      id: 9,
      category: "Core Strength",
      title: "Plank Hold",
      type: "22 Active Users",
      image: exerciseImg,
      videoUrl: "https://hrvtfeupqubpyqyojtmc.supabase.co/storage/v1/object/public/exercise-videos/plank.mp4",
    },
    { id: 10, category: "Core Strength", title: "Russian Twists", type: "16 Active Users", image: exerciseImg },
    { id: 11, category: "Core Strength", title: "Leg Raises", type: "13 Active Users", image: exerciseImg },
    {
      id: 12,
      category: "Core Strength",
      title: "Bicycle Crunches",
      type: "19 Active Users",
      image: exerciseImg,
      videoUrl: "https://hrvtfeupqubpyqyojtmc.supabase.co/storage/v1/object/public/exercise-videos/crunches.mp4",
    },

    // Lower Body - 4 exercises
    { id: 13, category: "Lower Body", title: "Bodyweight Squats", type: "25 Active Users", image: exerciseImg },
    { id: 14, category: "Lower Body", title: "Lunges", type: "17 Active Users", image: exerciseImg },
    { id: 15, category: "Lower Body", title: "Glute Bridges", type: "20 Active Users", image: exerciseImg },
    { id: 16, category: "Lower Body", title: "Calf Raises", type: "10 Active Users", image: exerciseImg },
  ]);

  // ✅ ATH-305/308: preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // ✅ ATH-308: ref to stop playback on close
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ ATH-309: error state
  const [videoError, setVideoError] = useState<string | null>(null);

  function handlePlay(ex: Exercise) {
    setVideoError(null); // ✅ ATH-309: clear error on open
    setSelectedExercise(ex);
    setIsPreviewOpen(true);
  }

  // ✅ ATH-308: close modal + stop video immediately
  function closePreview() {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setVideoError(null); // ✅ ATH-309: clear error on close
    setIsPreviewOpen(false);
    setSelectedExercise(null);
  }

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                </svg>
              </span>
              <input type="text" className="search-bar" placeholder="Search" />
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
                  <img src={exercise.image} alt={exercise.title} className="exercise-image" />
                  <div className="exercise-info">
                    <h3>{exercise.title}</h3>
                    <p>{exercise.category}</p>
                    <span className="exercise-tag">
                      <span className="material-symbols-outlined">vital_signs</span>
                      {exercise.type}
                    </span>

                    {/* ✅ ATH-305: Play button only when video exists */}
                    {exercise.videoUrl ? (
                      <button type="button" className="play-btn" onClick={() => handlePlay(exercise)}>
                        ▶ Play
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* ✅ ATH-305/308/309: Video preview modal */}
        {isPreviewOpen && selectedExercise?.videoUrl && (
          <div className="video-modal-overlay" onClick={closePreview}>
            <div className="video-modal" onClick={(e) => e.stopPropagation()}>
              <div className="video-modal-header">
                <h3>{selectedExercise.title}</h3>
                <button type="button" className="video-modal-close" onClick={closePreview}>
                  ✕
                </button>
              </div>

              <video
                ref={videoRef}
                src={selectedExercise.videoUrl}
                controls
                autoPlay
                // ✅ ATH-309: handle video load failure gracefully
                onError={() => setVideoError("Video failed to load. Please try again later.")}
                style={{ width: "100%", borderRadius: "10px" }}
              />

              {/* ✅ ATH-309: show user-friendly error (no crash) */}
              {videoError && (
                <p style={{ marginTop: "8px", color: "#b91c1c", fontSize: "14px" }}>
                  {videoError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ExerciseDashboard;
