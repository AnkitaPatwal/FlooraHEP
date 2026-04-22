import AppLayout from "../../components/layouts/AppLayout";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "../../pages/main/CreatePlan.css";
import "./CreateExercise.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const MIN_SETS = 1;
const MAX_SETS = 20;
const MIN_REPS = 1;
const MAX_REPS = 100;

function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

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

const EditExercise: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [exercise, setExercise] = useState({
    title: "",
    category: "",
    setCount: "",
    repCount: "",
    description: "",
    video: null as File | null,
    thumbnail: null as File | null,
  });
  const [initialExercise, setInitialExercise] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchExercise = async () => {
      if (!id) return;
      try {
        setLoadingExercise(true);
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/exercises/${id}`, { headers });
        if (!res.ok) throw new Error("Failed to load exercise");
        const data = await res.json();
        setExercise({
          title: data.title || "",
          category: data.body_part || "",
          setCount: data.default_sets != null ? String(data.default_sets) : "",
          repCount: data.default_reps != null ? String(data.default_reps) : "",
          description: data.description || "",
          video: null,
          thumbnail: null,
        });
        setInitialExercise(data);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load exercise");
      } finally {
        setLoadingExercise(false);
      }
    };
    fetchExercise();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name === "setCount" || name === "repCount") {
      value = sanitizeIntegerInput(value);
    }
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
    const sets = exercise.setCount ? Number(exercise.setCount) : NaN;
    const reps = exercise.repCount ? Number(exercise.repCount) : NaN;
    if (!Number.isInteger(sets)) {
      errors.setCount = "Sets must be a whole number";
    } else if (sets < MIN_SETS || sets > MAX_SETS) {
      errors.setCount = `Sets must be between ${MIN_SETS} and ${MAX_SETS}`;
    }
    if (!Number.isInteger(reps)) {
      errors.repCount = "Reps must be a whole number";
    } else if (reps < MIN_REPS || reps > MAX_REPS) {
      errors.repCount = `Reps must be between ${MIN_REPS} and ${MAX_REPS}`;
    }
    if (exercise.video) {
      const ext = exercise.video.name.split(".").pop()?.toLowerCase();
      if (!["mp4", "mov"].includes(ext || "")) errors.video = "Video must be .mp4 or .mov";
    }
    if (exercise.thumbnail) {
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
    if (!id) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!validateForm()) {
      setErrorMessage("Please fix the errors below.");
      return;
    }

    setIsSubmitting(true);
    try {
      const patchPayload: Record<string, unknown> = {};
      const init = initialExercise;
      if (init) {
        if (exercise.title.trim() !== String(init.title || "")) patchPayload.title = exercise.title.trim();
        if (exercise.description !== String(init.description || "")) patchPayload.description = exercise.description.trim();
        const newSets = exercise.setCount ? Number(exercise.setCount) : null;
        if (newSets !== (init.default_sets ?? null)) patchPayload.default_sets = newSets;
        const newReps = exercise.repCount ? Number(exercise.repCount) : null;
        if (newReps !== (init.default_reps ?? null)) patchPayload.default_reps = newReps;
        const newCat = exercise.category.trim() || null;
        if (newCat !== (init.body_part ?? null)) patchPayload.category = newCat;
      } else {
        patchPayload.title = exercise.title.trim();
        patchPayload.description = exercise.description.trim();
        patchPayload.default_sets = exercise.setCount ? Number(exercise.setCount) : null;
        patchPayload.default_reps = exercise.repCount ? Number(exercise.repCount) : null;
        patchPayload.category = exercise.category.trim() || null;
      }

      if (Object.keys(patchPayload).length === 0 && !exercise.video && !exercise.thumbnail) {
        setErrorMessage("No changes to save");
        setIsSubmitting(false);
        return;
      }

      if (Object.keys(patchPayload).length > 0) {
        const headers = await authHeadersJson();
        const patchRes = await fetch(`${API_URL}/api/exercises/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(patchPayload),
        });
        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          if (patchRes.status === 409) {
            setErrorMessage("Exercise name already exists");
            setIsSubmitting(false);
            return;
          }
          throw new Error(errData.error || errData.detail || "Update failed");
        }
      }

      if (exercise.video) {
        const formData = new FormData();
        formData.append("file", exercise.video);
        const headers = await authHeaders();
        const videoRes = await fetch(`${API_URL}/api/exercises/${id}/video`, {
          method: "POST",
          headers,
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
        const headers = await authHeaders();
        const thumbRes = await fetch(`${API_URL}/api/exercises/${id}/thumbnail`, {
          method: "POST",
          headers,
          body: formData,
        });
        if (!thumbRes.ok) {
          const errData = await thumbRes.json();
          throw new Error(errData.detail || errData.error || "Thumbnail upload failed");
        }
      }

      setSuccessMessage("Exercise updated successfully");
      setTimeout(() => navigate(`/exercises/${id}`), 800);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update exercise");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingExercise) {
    return (
      <AppLayout>
        <div className="create-exercise-page create-plan-page--unified">
          <p>Loading exercise...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="create-exercise-page create-plan-page--unified">
        <header className="create-exercise-header">
          <div className="create-exercise-header-left">
            <h1 className="exercise-title">Edit Exercise</h1>
          </div>
          <div className="create-exercise-header-right create-session-header-right">
            <button
              type="button"
              className="back-btn back-btn--v2 create-plan-back-btn"
              onClick={() => navigate(`/exercises/${id}`)}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="submit"
              className="save-btn create-plan-save-btn"
              form="edit-exercise-form"
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

        <form id="edit-exercise-form" className="exercise-form" onSubmit={handleSubmit}>
          <div className="upload-section">
            <div className={`upload-box ${fieldErrors.video ? "error" : ""}`}>
              <label htmlFor="video">Replace Video (optional)</label>
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
              <label htmlFor="thumbnail">Replace Thumbnail (optional)</label>
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

          <div className="create-exercise-fields">
          <div className={`input-group ${fieldErrors.title ? "error" : ""}`}>
            <label htmlFor="title">Title</label>
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

          <div className="input-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              name="category"
              value={exercise.category}
              onChange={handleChange}
              placeholder="Enter category (e.g. Core, Lower Body)"
            />
          </div>

          <div className="input-row">
            <div className={`input-group half ${fieldErrors.setCount ? "error" : ""}`}>
              <label htmlFor="setCount">Set Count</label>
              <input
                id="setCount"
                type="text"
                name="setCount"
                value={exercise.setCount}
                onChange={handleChange}
                placeholder="3"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {fieldErrors.setCount && <div className="field-error">{fieldErrors.setCount}</div>}
            </div>
            <div className={`input-group half ${fieldErrors.repCount ? "error" : ""}`}>
              <label htmlFor="repCount">Rep Count</label>
              <input
                id="repCount"
                type="text"
                name="repCount"
                value={exercise.repCount}
                onChange={handleChange}
                placeholder="3"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {fieldErrors.repCount && <div className="field-error">{fieldErrors.repCount}</div>}
            </div>
          </div>

          <div className={`input-group ${fieldErrors.description ? "error" : ""}`}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={exercise.description}
              onChange={handleChange}
              placeholder="Describe how to perform this exercise..."
            />
            {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
          </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditExercise;