// Set environment variables FIRST (before any imports)
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_JWT_SECRET = "test-jwt-secret-key-for-testing";

import request from "supertest";
import app from "../../server";
import { supabaseServer } from "../../lib/supabaseServer";
import * as videoService from "../../services/videoService";
import jwt from "jsonwebtoken";

// ── Mock Supabase storage and DB ─────────────────────────────────────────────
jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../../services/videoService", () => ({
  ...jest.requireActual("../../services/videoService"),
  linkVideoToExercise: jest.fn(),
  BUCKET_NAME: "exercise-videos",
}));

// ── JWT helpers ───────────────────────────────────────────────────────────────
const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(role: string) {
  return jwt.sign(
    { sub: "admin-uuid-123", email: "admin@test.com", role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const superAdminToken = makeToken("super_admin");
const adminToken = makeToken("admin");

// ── Mock storage chain ────────────────────────────────────────────────────────
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockLinkVideo = videoService.linkVideoToExercise as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  // Storage mock
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/exercise-videos/exercises/1/123_test.mp4" },
  });
  (supabaseServer.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  // DB mock
  mockSingle.mockResolvedValue({ data: { video_id: 42 }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  (supabaseServer.from as jest.Mock).mockReturnValue({ insert: mockInsert });

  // linkVideoToExercise mock
  mockLinkVideo.mockResolvedValue(undefined);
});

describe("POST /api/exercises/:id/video — ATH-393", () => {

  it("valid .mp4 upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("storage_path");
    expect(res.body.storage_path).toContain("exercises/1/");
    expect(res.body).toHaveProperty("url");
    expect(res.body).toHaveProperty("metadata");
    expect(mockLinkVideo).toHaveBeenCalledWith(expect.anything(), 1, 42);
  });

  it("valid .mov upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", `Bearer ${superAdminToken}`)
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
      .set("Authorization", `Bearer ${superAdminToken}`)
      .attach("file", Buffer.from("not a video"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it("non-super_admin (admin role) returns 403 and does not upload", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Authorization", `Bearer ${adminToken}`)
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
      .set("Authorization", `Bearer ${superAdminToken}`)
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

});