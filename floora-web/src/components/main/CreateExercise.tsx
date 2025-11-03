import AppLayout from "../../components/layouts/AppLayout";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateExercise.css";

const CreateExercise: React.FC = () => {
  const navigate = useNavigate();

  const [exercise, setExercise] = useState({
    title: "",
    category: "",
    setCount: "",
    repCount: "",
    exerciseCopy: "",
    video: null as File | null,
    thumbnail: null as File | null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setExercise({ ...exercise, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setExercise({ ...exercise, [name]: files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Exercise data:", exercise);
    // TODO: connect to backend API
  };

  return (
    <AppLayout>
      <div className="create-exercise-page">
        {/* ===== HEADER ===== */}
        <header className="create-exercise-header">
          <div className="create-exercise-header-left">
            <h1 className="exercise-title">Add New Exercise</h1>
          </div>
          <div className="create-exercise-header-right">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/exercise-dashboard")}
            >
              Back
            </button>
            <button
              type="submit"
              className="save-btn"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>
        </header>

        {/* ===== FORM ===== */}
        <form className="exercise-form" onSubmit={handleSubmit}>
          {/* Upload Section */}
          <div className="upload-section">
            <div className="upload-box">
              <label htmlFor="video">Video</label>
              <input
                type="file"
                id="video"
                name="video"
                accept="video/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="upload-box">
              <label htmlFor="thumbnail">Thumbnail</label>
              <input
                type="file"
                id="thumbnail"
                name="thumbnail"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Input Fields */}
          <div className="input-group">
            <label htmlFor="title">Title of Exercise</label>
            <input
              id="title"
              type="text"
              name="title"
              value={exercise.title}
              onChange={handleChange}
              placeholder="Enter exercise title"
            />
          </div>

          <div className="input-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              name="category"
              value={exercise.category}
              onChange={handleChange}
              placeholder="Enter exercise category"
            />
          </div>

          <div className="input-row">
            <div className="input-group half">
              <label htmlFor="setCount">Set Count</label>
              <input
                id="setCount"
                type="number"
                name="setCount"
                value={exercise.setCount}
                onChange={handleChange}
                placeholder="3"
              />
            </div>

            <div className="input-group half">
              <label htmlFor="repCount">Rep Count</label>
              <input
                id="repCount"
                type="number"
                name="repCount"
                value={exercise.repCount}
                onChange={handleChange}
                placeholder="3"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="exerciseCopy">Exercise Copy</label>
            <textarea
              id="exerciseCopy"
              name="exerciseCopy"
              value={exercise.exerciseCopy}
              onChange={handleChange}
              placeholder="Describe how to perform this exercise..."
            />
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateExercise;
