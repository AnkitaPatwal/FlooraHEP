import AppLayout from "../../components/layouts/AppLayout";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateExercise.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
    tags: "",
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
        const res = await fetch(`${API_URL}/api/exercises/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load exercise");
        const data = await res.json();
        const tagsStr = Array.isArray(data.tags) ? data.tags.join(", ") : "";
        setExercise({
          title: data.title || "",
          category: data.body_part || "",
          setCount: data.default_sets != null ? String(data.default_sets) : "",
          repCount: data.default_reps != null ? String(data.default_reps) : "",
          description: data.description || "",
          tags: tagsStr,
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
        if (exercise.title.trim() !== (String(init.title || ""))) {
          patchPayload.title = exercise.title.trim();
        }
        if (exercise.description !== (String(init.description || ""))) {
          patchPayload.description = exercise.description.trim();
        }
        const newSets = exercise.setCount ? Number(exercise.setCount) : null;
        if (newSets !== (init.default_sets ?? null)) patchPayload.default_sets = newSets;
        const newReps = exercise.repCount ? Number(exercise.repCount) : null;
        if (newReps !== (init.default_reps ?? null)) patchPayload.default_reps = newReps;
        const newCat = exercise.category.trim() || null;
        if (newCat !== (init.body_part ?? null)) patchPayload.category = newCat;
        const newTags = exercise.tags.trim()
          ? exercise.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
        const initTags = Array.isArray(init.tags) ? init.tags : [];
        if (JSON.stringify(newTags) !== JSON.stringify(initTags)) {
          patchPayload.tags = newTags;
        }
      } else {
        patchPayload.title = exercise.title.trim();
        patchPayload.description = exercise.description.trim();
        patchPayload.default_sets = exercise.setCount ? Number(exercise.setCount) : null;
        patchPayload.default_reps = exercise.repCount ? Number(exercise.repCount) : null;
        patchPayload.category = exercise.category.trim() || null;
        patchPayload.tags = exercise.tags.trim()
          ? exercise.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
      }
      if (Object.keys(patchPayload).length === 0 && !exercise.video && !exercise.thumbnail) {
        setErrorMessage("No changes to save");
        setIsSubmitting(false);
        return;
      }

      if (Object.keys(patchPayload).length > 0) {
        const patchRes = await fetch(`${API_URL}/api/exercises/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
        const videoRes = await fetch(`${API_URL}/api/exercises/${id}/video`, {
          method: "POST",
          credentials: "include",
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
        const thumbRes = await fetch(`${API_URL}/api/exercises/${id}/thumbnail`, {
          method: "POST",
          credentials: "include",
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
        <div className="create-exercise-page">
          <p>Loading exercise...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="create-exercise-page">
        <header className="create-exercise-header">
          <div className="create-exercise-header-left">
            <h1 className="exercise-title">Edit Exercise</h1>
          </div>
          <div className="create-exercise-header-right">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate(`/exercises/${id}`)}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="submit"
              className="save-btn"
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
              {exercise.video && (
                <div className="file-selected">{exercise.video.name}</div>
              )}
              {fieldErrors.video && (
                <div className="field-error">{fieldErrors.video}</div>
              )}
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
              {exercise.thumbnail && (
                <div className="file-selected">{exercise.thumbnail.name}</div>
              )}
              {fieldErrors.thumbnail && (
                <div className="field-error">{fieldErrors.thumbnail}</div>
              )}
            </div>
          </div>

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
            {fieldErrors.title && (
              <div className="field-error">{fieldErrors.title}</div>
            )}
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
            <div className="input-group half">
              <label htmlFor="setCount">Set Count</label>
              <input
                id="setCount"
                type="number"
                name="setCount"
                value={exercise.setCount}
                onChange={handleChange}
                placeholder="3"
                min={1}
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
                min={1}
              />
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
            {fieldErrors.description && (
              <div className="field-error">{fieldErrors.description}</div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              name="tags"
              value={exercise.tags}
              onChange={handleChange}
              placeholder="e.g. quadriceps, hamstrings (comma-separated)"
            />
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditExercise;
