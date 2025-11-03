import React, { useState } from "react";
import "./CreateExercise.css";

const CreateExercise: React.FC = () => {
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
    // TODO: Later send this data to backend API endpoint (e.g., POST /api/exercises)
  };

  return (
    <div className="create-exercise-container">
      {/* Header */}
      <div className="header-section">
        <h2>Add New Exercise</h2>
        <div className="header-buttons">
          <button type="button" className="back-btn">
            Back
          </button>
          <button type="submit" className="save-btn" onClick={handleSubmit}>
            Save
          </button>
        </div>
      </div>

      {/* Form */}
      <form className="exercise-form" onSubmit={handleSubmit}>
        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-box video-upload">
            <label htmlFor="video">Video</label>
            <input
              type="file"
              id="video"
              name="video"
              accept="video/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="upload-box thumbnail-upload">
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

        {/* Text Inputs */}
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
  );
};

export default CreateExercise;
