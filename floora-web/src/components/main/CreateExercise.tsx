import AppLayout from "../../components/layouts/AppLayout";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "../../pages/main/CreatePlan.css";
import "./CreateExercise.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const MIN_SETS = 1;
const MAX_SETS = 20;
const MIN_REPS = 1;
const MAX_REPS = 100;

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

async function authHeadersJson(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

function isValidVideoFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ["mp4", "mov"].includes(ext || "");
}

function isValidThumbnailFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp"].includes(ext || "");
}

function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three stacked photo frames (white fill + teal stroke); sun + mountain inside front card. */
function UploadDropIcon() {
  const stroke = "#6F9C9C";
  const fill = "#ffffff";
  const sw = 2.25;
  return (
    <svg
      className="create-exercise-upload-icon"
      width="48"
      height="48"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Back left — behind center, rotated ~-8°, shifted left */}
      <rect
        x="10"
        y="15"
        width="26"
        height="32"
        rx="3.5"
        ry="3.5"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-8 23 31)"
      />
      {/* Back right — behind center, rotated ~+8°, shifted right */}
      <rect
        x="28"
        y="15"
        width="26"
        height="32"
        rx="3.5"
        ry="3.5"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(8 41 31)"
      />
      {/* Front — centered, dominant; corner radius scaled for ~12–16px feel at common sizes */}
      <rect
        x="17"
        y="14"
        width="30"
        height="36"
        rx="5"
        ry="5"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sun (top-right inside front) */}
      <circle
        cx="41.25"
        cy="20.25"
        r="2.85"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mountain silhouette: closed for white fill; stroke traces skyline + base */}
      <path
        d="M 18.25 47.5 L 26.5 30.75 L 30.25 36.25 L 35.25 28.5 L 45.75 47.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CreateExercise: React.FC = () => {
  const navigate = useNavigate();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
  const [dragOver, setDragOver] = useState<"video" | "thumbnail" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name === "setCount" || name === "repCount") {
      value = sanitizeIntegerInput(value);
    }
    setExercise((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    if (!isValidVideoFile(file)) {
      setFieldErrors((prev) => ({
        ...prev,
        video: "Video must be .mp4 or .mov",
      }));
      return;
    }
    setExercise((prev) => ({ ...prev, video: file }));
    setFieldErrors((prev) => ({ ...prev, video: "" }));
  };

  const pickThumbnail = (file: File | undefined) => {
    if (!file) return;
    if (!isValidThumbnailFile(file)) {
      setFieldErrors((prev) => ({
        ...prev,
        thumbnail: "Thumbnail must be .png, .jpg, .jpeg, or .webp",
      }));
      return;
    }
    setExercise((prev) => ({ ...prev, thumbnail: file }));
    setFieldErrors((prev) => ({ ...prev, thumbnail: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const file = files?.[0];
    if (name === "video") pickVideo(file);
    if (name === "thumbnail") pickThumbnail(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent, field: "video" | "thumbnail") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (field === "video") pickVideo(file);
    else pickThumbnail(file);
  };

  const handleDragOver = (e: React.DragEvent, field: "video" | "thumbnail") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(field);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOver(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!exercise.title.trim()) errors.title = "Title is required";
    if (!exercise.category.trim()) errors.category = "Category is required";
    if (!exercise.exerciseCopy.trim()) errors.exerciseCopy = "Description is required";
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
    if (!exercise.video) {
      errors.video = "Video is required";
    } else if (!isValidVideoFile(exercise.video)) {
      errors.video = "Video must be .mp4 or .mov";
    }
    if (!exercise.thumbnail) {
      errors.thumbnail = "Thumbnail is required";
    } else if (!isValidThumbnailFile(exercise.thumbnail)) {
      errors.thumbnail = "Thumbnail must be .png, .jpg, .jpeg, or .webp";
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
      <div className="create-exercise-page create-plan-page--unified">
        <header className="create-exercise-header">
          <div className="create-exercise-header-left">
            <h1 className="exercise-title">Add New Exercise</h1>
          </div>
          <div className="create-exercise-header-right create-session-header-right">
            <button
              type="button"
              className="back-btn back-btn--v2 create-plan-back-btn"
              onClick={() => navigate("/exercise-dashboard")}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="submit"
              className="save-btn create-plan-save-btn"
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
          <div className="create-exercise-upload-grid">
            <div className="create-exercise-upload-field">
              <div
                className={[
                  "create-exercise-dropzone",
                  "create-exercise-dropzone--video",
                  fieldErrors.video ? "is-error" : "",
                  dragOver === "video" ? "is-dragover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(e) => handleDragOver(e, "video")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "video")}
                onClick={() => videoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    videoInputRef.current?.click();
                  }
                }}
                tabIndex={0}
                aria-label="Video upload: drop file or click to browse"
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  name="video"
                  className="create-exercise-file-input"
                  accept=".mp4,.mov,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  aria-hidden
                  tabIndex={-1}
                />
                <div className="create-exercise-dropzone-body">
                  <UploadDropIcon />
                  <div className="create-exercise-dropzone-hint">
                    Drop your files here or{" "}
                    <button
                      type="button"
                      className="create-exercise-browse"
                      onClick={(e) => {
                        e.stopPropagation();
                        videoInputRef.current?.click();
                      }}
                    >
                      browse
                    </button>
                  </div>
                  {exercise.video ? (
                    <p className="create-exercise-video-filename">{exercise.video.name}</p>
                  ) : null}
                </div>
              </div>
              <span className="create-exercise-upload-caption">Video</span>
              {fieldErrors.video ? (
                <div className="field-error create-exercise-field-error">{fieldErrors.video}</div>
              ) : null}
            </div>

            <div className="create-exercise-upload-field">
              <div
                className={[
                  "create-exercise-dropzone",
                  "create-exercise-dropzone--thumbnail",
                  exercise.thumbnail ? "create-exercise-dropzone--thumbnail-active" : "",
                  fieldErrors.thumbnail ? "is-error" : "",
                  dragOver === "thumbnail" ? "is-dragover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(e) => handleDragOver(e, "thumbnail")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "thumbnail")}
                onClick={() => thumbnailInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    thumbnailInputRef.current?.click();
                  }
                }}
                tabIndex={0}
                aria-label="Thumbnail upload: drop file or click to browse"
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  name="thumbnail"
                  className="create-exercise-file-input"
                  accept=".png,.jpg,.jpeg,.webp,image/*"
                  onChange={handleFileChange}
                  aria-hidden
                  tabIndex={-1}
                />
                <div
                  className={[
                    "create-exercise-dropzone-body",
                    exercise.thumbnail ? "create-exercise-dropzone-body--faded" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <UploadDropIcon />
                  <div className="create-exercise-dropzone-hint">
                    Drop your files here or{" "}
                    <button
                      type="button"
                      className="create-exercise-browse"
                      onClick={(e) => {
                        e.stopPropagation();
                        thumbnailInputRef.current?.click();
                      }}
                    >
                      browse
                    </button>
                  </div>
                </div>

                {exercise.thumbnail ? (
                  <div className="create-exercise-upload-floating-actions">
                    <span className="create-exercise-file-pill" title={exercise.thumbnail.name}>
                      {exercise.thumbnail.name}
                    </span>
                    <button
                      type="button"
                      className="create-exercise-replace-btn"
                      aria-label="Replace thumbnail"
                      onClick={(e) => {
                        e.stopPropagation();
                        thumbnailInputRef.current?.click();
                      }}
                    >
                      <PlusIcon />
                    </button>
                  </div>
                ) : null}
              </div>
              <span className="create-exercise-upload-caption">Thumbnail</span>
              {fieldErrors.thumbnail ? (
                <div className="field-error create-exercise-field-error">{fieldErrors.thumbnail}</div>
              ) : null}
            </div>
          </div>

          <div className="create-exercise-fields">
          <div className={`input-group ${fieldErrors.title ? "error" : ""}`}>
            <label htmlFor="title">Title of Exercise</label>
            <input
              id="title"
              type="text"
              name="title"
              value={exercise.title}
              onChange={handleChange}
              placeholder="Title"
            />
            {fieldErrors.title ? <div className="field-error">{fieldErrors.title}</div> : null}
          </div>

          <div className={`input-group ${fieldErrors.category ? "error" : ""}`}>
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              name="category"
              value={exercise.category}
              onChange={handleChange}
              placeholder="Category"
            />
            {fieldErrors.category ? <div className="field-error">{fieldErrors.category}</div> : null}
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
              {fieldErrors.setCount ? <div className="field-error">{fieldErrors.setCount}</div> : null}
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
              {fieldErrors.repCount ? <div className="field-error">{fieldErrors.repCount}</div> : null}
            </div>
          </div>

          <div className={`input-group ${fieldErrors.exerciseCopy ? "error" : ""}`}>
            <label htmlFor="exerciseCopy">Exercise Copy</label>
            <textarea
              id="exerciseCopy"
              name="exerciseCopy"
              value={exercise.exerciseCopy}
              onChange={handleChange}
              placeholder="Instructions for the client."
            />
            {fieldErrors.exerciseCopy ? (
              <div className="field-error">{fieldErrors.exerciseCopy}</div>
            ) : null}
          </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateExercise;
