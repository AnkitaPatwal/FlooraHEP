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
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

// Mock admin_users for requireSuperAdmin middleware
jest.mock("@supabase/supabase-js", () => {
  const actualSupabase = jest.requireActual("@supabase/supabase-js");
  return {
    ...actualSupabase,
    createClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === "admin_users") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((_column: string, value: string) => ({
                maybeSingle: jest.fn(() => {
                  if (value === "admin-uuid-123") {
                    return Promise.resolve({
                      data: { id: "admin-uuid-123", email: "superadmin@test.com", role: "super_admin", is_active: true },
                      error: null,
                    });
                  }
                  if (value === "admin-uuid-456") {
                    return Promise.resolve({
                      data: { id: "admin-uuid-456", email: "admin@test.com", role: "admin", is_active: true },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
              })),
            })),
          };
        }
        return actualSupabase.createClient().from(table);
      }),
      auth: { persistSession: false },
    })),
  };
});

jest.mock("../../services/videoService", () => ({
  ...jest.requireActual("../../services/videoService"),
  linkVideoToExercise: jest.fn(),
  BUCKET_NAME: "exercise-videos",
}));

// ── JWT helpers (cookie-based auth) ───────────────────────────────────────────
const ADMIN_JWT_SECRET = "test-jwt-secret-key-for-testing";

function makeToken(role: string, id = "admin-uuid-123") {
  return jwt.sign(
    { id, email: "admin@test.com", role, name: "Test Admin" },
    ADMIN_JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const superAdminToken = makeToken("super_admin");
const adminToken = makeToken("admin", "admin-uuid-456");

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

  // DB mock: exercise check + video insert
  const exerciseChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
  };
  mockSingle.mockResolvedValue({ data: { video_id: 42 }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
    if (table === "exercise") return exerciseChain;
    return { insert: mockInsert };
  });

  // linkVideoToExercise mock
  mockLinkVideo.mockResolvedValue(undefined);
});

describe("POST /api/exercises/:id/video — ATH-393", () => {

  it("valid .mp4 upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Cookie", `admin_token=${superAdminToken}`)
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("storage_path");
    expect(res.body.storage_path).toContain("exercises/1/");
    expect(res.body).toHaveProperty("url");
    expect(res.body).toHaveProperty("metadata");
    expect(mockLinkVideo).toHaveBeenCalledWith(expect.anything(), 1, 42, expect.stringMatching(/^https:\/\//));
  });

  it("valid .mov upload returns 200 with storage_path and url", async () => {
    const res = await request(app)
      .post("/api/exercises/1/video")
      .set("Cookie", `admin_token=${superAdminToken}`)
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
      .set("Cookie", `admin_token=${superAdminToken}`)
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
      .set("Cookie", `admin_token=${adminToken}`)
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
      .set("Cookie", `admin_token=${superAdminToken}`)
      .attach("file", Buffer.from("fake mp4"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

});