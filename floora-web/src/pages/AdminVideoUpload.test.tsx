import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminVideoUpload from "./AdminVideoUpload";

// Mock upload function
const mockUpload = vi.fn();

vi.mock("../lib/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/admin-api")>();
  return {
    ...actual,
    uploadExerciseVideo: (...args: unknown[]) => mockUpload(...args),
  };
});

// Mock AppLayout (same pattern used in your other tests)
vi.mock("../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

beforeEach(() => {
  cleanup();
  mockUpload.mockReset();

  // Mock URL.createObjectURL
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-preview"),
    revokeObjectURL: vi.fn(),
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/video-upload"]}>
      <Routes>
        <Route path="/admin/video-upload" element={<AdminVideoUpload />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminVideoUpload", () => {
  it("rejects invalid file type", async () => {
    renderPage();

    const fileInput = screen.getByLabelText(/video file/i).parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const badFile = new File(["x"], "image.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: { files: [badFile] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only .mp4 and .mov files are allowed."
    );
  });

  it("shows preview for valid file", async () => {
    renderPage();

    const fileInput = screen.getByLabelText(/video file/i).parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const goodFile = new File(["x"], "video.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, {
      target: { files: [goodFile] },
    });

    expect(await screen.findByText(/preview/i)).toBeInTheDocument();
  });

  it("shows error if upload fails", async () => {
    mockUpload.mockRejectedValueOnce(new Error("Server error"));

    renderPage();

    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "5" },
    });

    const fileInput = screen.getByLabelText(/video file/i).parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const goodFile = new File(["x"], "video.mov", { type: "video/quicktime" });

    fireEvent.change(fileInput, {
      target: { files: [goodFile] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  });

  it("shows loading state during upload", async () => {
    let resolveUpload: (v: unknown) => void = () => {};

    mockUpload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );

    renderPage();

    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "3" },
    });

    const fileInput = screen.getByLabelText(/video file/i).parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const goodFile = new File(["x"], "video.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, {
      target: { files: [goodFile] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();

    resolveUpload({ ok: true, video_id: 1, publicUrl: "x" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    });
  });
});