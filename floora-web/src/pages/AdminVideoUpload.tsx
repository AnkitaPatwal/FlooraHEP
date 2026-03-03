import { useEffect, useState } from "react";
import AppLayout from "../components/layouts/AppLayout";
import { uploadExerciseVideo } from "../lib/admin-api";

const allowed = new Set(["video/mp4", "video/quicktime"]);

export default function AdminVideoUpload() {
  const [exerciseId, setExerciseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFilePick(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);

    if (!f) return;

    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const okExt = ext === "mp4" || ext === "mov";
    const okType = allowed.has(f.type);

    if (!okExt || !okType) {
      setError("Only .mp4 and .mov files are allowed.");
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onUpload() {
    setError(null);
    const id = Number(exerciseId);

    if (!Number.isInteger(id) || id <= 0) {
      setError("Please enter a valid Exercise ID.");
      return;
    }
    if (!file) {
      setError("Please choose a video file.");
      return;
    }

    setBusy(true);
    try {
      await uploadExerciseVideo(id, file);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <h1>Upload Exercise Video</h1>

        <label style={{ display: "block", marginTop: 12 }}>
          Exercise ID
          <input
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            placeholder="e.g. 12"
            disabled={busy}
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          Video File
          <input
            type="file"
            accept=".mp4,.mov,video/mp4,video/quicktime"
            onChange={(e) => onFilePick(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </label>

        {preview && (
          <div style={{ marginTop: 12 }}>
            <div>Preview</div>
            <video controls src={preview} style={{ width: "100%" }} />
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: "red", marginTop: 12 }}>
            {error}
          </p>
        )}

        <button onClick={onUpload} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>
    </AppLayout>
  );
}