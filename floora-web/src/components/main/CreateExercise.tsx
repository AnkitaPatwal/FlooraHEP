import AppLayout from "../../components/layouts/AppLayout";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "./CreateExercise.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

async function authHeadersJson(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setExercise((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files?.[0]) {
      setExercise((prev) => ({ ...prev, [name]: files[0] }));
      if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!exercise.title.trim()) errors.title = "Title is required";
    if (!exercise.category.trim()) errors.category = "Category is required";
    if (!exercise.exerciseCopy.trim()) errors.exerciseCopy = "Description is required";
    const sets = exercise.setCount ? Number(exercise.setCount) : NaN;
    const reps = exercise.repCount ? Number(exercise.repCount) : NaN;
    if (!Number.isInteger(sets) || sets < 1) errors.setCount = "Sets must be a positive integer";
    if (!Number.isInteger(reps) || reps < 1) errors.repCount = "Reps must be a positive integer";
    if (!exercise.video) {
      errors.video = "Video is required";
    } else {
      const ext = exercise.video.name.split(".").pop()?.toLowerCase();
      if (!["mp4", "mov"].includes(ext || "")) errors.video = "Video must be .mp4 or .mov";
    }
    if (!exercise.thumbnail) {
      errors.thumbnail = "Thumbnail is required";
    } else {
      const ext = exercise.thumbnail.name.split(".").pop()?.toLowerCase();
      if (!["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
        errors.thumbnail = "Thumbnail must be .png, .jpg, .jpeg, or .webp";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!validateForm()) {
      setErrorMessage("Please fix the errors below.");
      return;
    }

    setIsSubmitting(true);
    try {
      const jsonHeaders = await authHeadersJson();
      const createRes = await fetch(`${API_URL}/api/exercises`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          title: exercise.title.trim(),
          description: exercise.exerciseCopy.trim(),
          default_sets: Number(exercise.setCount),
          default_reps: Number(exercise.repCount),
          category: exercise.category.trim(),
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        const msg = errData.error || errData.detail || "Create failed";
        if (createRes.status === 409) {
          setErrorMessage("Exercise name already exists");
          setIsSubmitting(false);
          return;
        }
        throw new Error(msg);
      }

      const created = await createRes.json();
      const exerciseId = created.exercise_id;

      if (exercise.video) {
        const formData = new FormData();
        formData.append("file", exercise.video);
        const fileHeaders = await authHeaders();
        const videoRes = await fetch(`${API_URL}/api/exercises/${exerciseId}/video`, {
          method: "POST",
          headers: fileHeaders,
          body: formData,
        });
        if (!videoRes.ok) {
          const errData = await videoRes.json();
          throw new Error(errData.detail || errData.error || "Video upload failed");
        }
      }

      if (exercise.thumbnail) {
        const formData = new FormData();
        formData.append("file", exercise.thumbnail);
        const fileHeaders = await authHeaders();
        const thumbRes = await fetch(`${API_URL}/api/exercises/${exerciseId}/thumbnail`, {
          method: "POST",
          headers: fileHeaders,
          body: formData,
        });
        if (!thumbRes.ok) {
          const errData = await thumbRes.json();
          throw new Error(errData.detail || errData.error || "Thumbnail upload failed");
        }
      }

      setSuccessMessage("Exercise added successfully");
      setTimeout(() => navigate("/exercise-dashboard", { replace: true }), 800);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create exercise");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="create-exercise-page">
        <header className="create-exercise-header">
          <div className="create-exercise-header-left">
            <h1 className="exercise-title">Add New Exercise</h1>
          </div>
          <div className="create-exercise-header-right">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/exercise-dashboard")}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="submit"
              className="save-btn"
              form="create-exercise-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="message-banner error-banner">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="message-banner success-banner">{successMessage}</div>
        )}

        <form id="create-exercise-form" className="exercise-form" onSubmit={handleSubmit}>
          <div className="upload-section">
            <div className={`upload-box ${fieldErrors.video ? "error" : ""}`}>
              <label htmlFor="video">Video</label>
              <input
                type="file"
                id="video"
                name="video"
                accept=".mp4,.mov,video/mp4,video/quicktime"
                onChange={handleFileChange}
              />
              {exercise.video && <div className="file-selected">{exercise.video.name}</div>}
              {fieldErrors.video && <div className="field-error">{fieldErrors.video}</div>}
            </div>

            <div className={`upload-box ${fieldErrors.thumbnail ? "error" : ""}`}>
              <label htmlFor="thumbnail">Thumbnail</label>
              <input
                type="file"
                id="thumbnail"
                name="thumbnail"
                accept=".png,.jpg,.jpeg,.webp,image/*"
                onChange={handleFileChange}
              />
              {exercise.thumbnail && <div className="file-selected">{exercise.thumbnail.name}</div>}
              {fieldErrors.thumbnail && <div className="field-error">{fieldErrors.thumbnail}</div>}
            </div>
          </div>

          <div className={`input-group ${fieldErrors.title ? "error" : ""}`}>
            <label htmlFor="title">Title of Exercise <span className="required">*</span></label>
            <input
              id="title"
              type="text"
              name="title"
              value={exercise.title}
              onChange={handleChange}
              placeholder="Enter exercise title"
            />
            {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
          </div>

          <div className={`input-group ${fieldErrors.category ? "error" : ""}`}>
            <label htmlFor="category">Category <span className="required">*</span></label>
            <input
              id="category"
              type="text"
              name="category"
              value={exercise.category}
              onChange={handleChange}
              placeholder="Enter exercise category"
            />
            {fieldErrors.category && <div className="field-error">{fieldErrors.category}</div>}
          </div>

          <div className="input-row">
            <div className={`input-group half ${fieldErrors.setCount ? "error" : ""}`}>
              <label htmlFor="setCount">Set Count <span className="required">*</span></label>
              <input
                id="setCount"
                type="number"
                name="setCount"
                value={exercise.setCount}
                onChange={handleChange}
                placeholder="3"
                min={1}
              />
              {fieldErrors.setCount && <div className="field-error">{fieldErrors.setCount}</div>}
            </div>

            <div className={`input-group half ${fieldErrors.repCount ? "error" : ""}`}>
              <label htmlFor="repCount">Rep Count <span className="required">*</span></label>
              <input
                id="repCount"
                type="number"
                name="repCount"
                value={exercise.repCount}
                onChange={handleChange}
                placeholder="3"
                min={1}
              />
              {fieldErrors.repCount && <div className="field-error">{fieldErrors.repCount}</div>}
            </div>
          </div>

          <div className={`input-group ${fieldErrors.exerciseCopy ? "error" : ""}`}>
            <label htmlFor="exerciseCopy">Exercise Copy (Description) <span className="required">*</span></label>
            <textarea
              id="exerciseCopy"
              name="exerciseCopy"
              value={exercise.exerciseCopy}
              onChange={handleChange}
              placeholder="Describe how to perform this exercise..."
            />
            {fieldErrors.exerciseCopy && <div className="field-error">{fieldErrors.exerciseCopy}</div>}
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateExercise;