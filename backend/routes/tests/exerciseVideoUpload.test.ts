import express from "express";
import request from "supertest";
import exercisesRouter from "../exercises";
import { supabaseServer } from "../../lib/supabaseServer";
import * as videoService from "../../services/videoService";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

let app: any;

jest.mock("../../middleware/requireSuperAdmin", () => ({
  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    const roleHeader = req.headers["x-test-admin-role"];

    req.admin = {
      id: roleHeader === "admin" ? "admin-uuid-456" : "admin-uuid-123",
      email: roleHeader === "admin" ? "admin@test.com" : "superadmin@test.com",
      role: roleHeader === "admin" ? "admin" : "super_admin",
      is_active: true,
    };

    if (req.admin.role !== "super_admin") {
      return res
        .status(403)
        .json({ ok: false, error: "Super admin required" });
    }

    next();
  },
}));

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    storage: { from: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

jest.mock("../../services/videoService", () => ({
  ...jest.requireActual("../../services/videoService"),
  linkVideoToExercise: jest.fn(),
  BUCKET_NAME: "exercise-videos",
}));

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockLinkVideo = videoService.linkVideoToExercise as jest.Mock;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use("/api/exercises", exercisesRouter);

  jest.clearAllMocks();

  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: {
      publicUrl:
        "https://example.supabase.co/storage/v1/object/public/exercise-videos/exercises/1/123_test.mp4",
    },
  });

  (supabaseServer.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  const exerciseChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { exercise_id: 1 },
      error: null,
    }),
  };

  mockSingle.mockResolvedValue({
    data: { video_id: 42 },
    error: null,
  });

  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });

  (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
    if (table === "exercise") return exerciseChain;
    if (table === "video") return { insert: mockInsert };
    return {};
  });

  mockLinkVideo.mockResolvedValue(undefined);
});

describe("POST /api/exercises/:id/video", () => {
  it("valid .mp4 upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("storage_path");
    expect(res.body.storage_path).toContain("exercises/1/");
    expect(res.body).toHaveProperty("url");
    expect(res.body).toHaveProperty("metadata");
    expect(mockLinkVideo).toHaveBeenCalledWith(
      expect.anything(),
      1,
      42,
      expect.any(String)
    );
    expect(mockLinkVideo).toHaveBeenCalledWith(
      expect.anything(),
      1,
      42,
      expect.stringMatching(/^https:\/\//)
    );
  });

  it("valid .mov upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake mov"), {
        filename: "test.mov",
        contentType: "video/quicktime",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");
  });

  it("invalid file type returns 400 and does not upload", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("not a video"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it("non-super_admin returns 403 and does not upload", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", "Bearer fake-token")
      .set("x-test-admin-role", "admin")
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("missing auth token returns 401 and does not upload", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(401);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("storage error returns 500 and linkVideoToExercise is never called", async () => {
    mockUpload.mockResolvedValue({ error: { message: "Bucket unavailable" } });

    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });
});