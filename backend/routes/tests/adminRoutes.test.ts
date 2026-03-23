let app: any;

// Set environment variables before loading modules
process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock createClient so auth.getUser accepts our custom JWT
jest.mock("@supabase/supabase-js", () => {
  const jwt = require("jsonwebtoken");
  const secret = process.env.ADMIN_JWT_SECRET || "test-admin-jwt-secret-key";
  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      auth: {
        persistSession: false,
        getUser: (token: string) => {
          try {
            const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };
            return Promise.resolve({
              data: { user: { id: decoded.id, email: decoded.email, user_metadata: { role: decoded.role } } },
              error: null,
            });
          } catch {
            return Promise.resolve({ data: { user: null }, error: { message: "Invalid token" } });
          }
        },
      },
    })),
  };
});

import request from "supertest";
import * as moduleService from "../../services/moduleService";

beforeAll(() => {
  // load server only AFTER mocks are in place
  app = require("../../server").default;
});

function adminTokenCookie() {
  const token = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  );
  return `admin_token=${token}`;
}

describe("GET /api/admin/modules", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with modules", async () => {
    const mockModules = [
      { module_id: 1, title: "Week 1", module_exercise: [] },
    ];

    jest
      .spyOn(moduleService, "getAllModulesWithExercises")
      .mockResolvedValue(mockModules as any);

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockModules);
  });

  it("returns 500 if service throws", async () => {
    jest
      .spyOn(moduleService, "getAllModulesWithExercises")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch modules" });
  });
});