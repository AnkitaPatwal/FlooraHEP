let app: any;

process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock @supabase/supabase-js: auth.getUser accepts custom JWT, from() for DB
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockDelete = jest.fn();
const mockOrder = jest.fn();

jest.mock("@supabase/supabase-js", () => {
  const jwt = require("jsonwebtoken");
  const secret = process.env.ADMIN_JWT_SECRET || "test-admin-jwt-secret-key";
  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => ({
        insert: mockInsert.mockReturnThis(),
        select: mockSelect.mockReturnThis(),
        single: mockSingle.mockReturnThis(),
        update: mockUpdate.mockReturnThis(),
        eq: mockEq.mockReturnThis(),
        delete: mockDelete.mockReturnThis(),
        order: mockOrder.mockReturnThis(),
      })),
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

beforeAll(() => {
  app = require("../../server").default;
});

function adminTokenCookie() {
  return `admin_token=${require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  )}`;
}

describe("POST /api/admin/plans", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  );

  afterEach(() => {
    jest.clearAllMocks();
    // Reset defaults
    mockInsert.mockReturnThis();
    mockSelect.mockReturnThis();
    mockSingle.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
    mockDelete.mockReturnThis();
    mockOrder.mockReturnThis();
  });

  it("returns 400 if title or description is missing", async () => {
    const res = await request(app)
      .post("/api/admin/plans")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`)
      .send({ moduleIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Title is required/);
  });

  it("creates a plan and plan_module links successfully", async () => {
    // Override the mock specifically for this test since Supabase chain resolves differently
    mockInsert.mockImplementationOnce(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { plan_id: 123 }, error: null })
      })
    }));
    mockInsert.mockImplementationOnce(() => Promise.resolve({ error: null }));

    const res = await request(app)
      .post("/api/admin/plans")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`)
      .send({
        title: "Test Plan",
        description: "Test Desc",
        moduleIds: [1, 2]
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Plan created successfully.");
    expect(res.body.planId).toBe(123);
  });

  it("returns 500 if plan creation fails", async () => {
    // Reset implementation just for this test
    mockInsert.mockImplementationOnce(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: new Error("DB fail") })
      })
    }));

    const res = await request(app)
      .post("/api/admin/plans")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`)
      .send({
        title: "Test Plan",
        description: "Test Desc",
        moduleIds: []
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to create plan.");
  });
});

describe("PUT /api/admin/plans/:id", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  );

  it("updates a plan successfully", async () => {
    mockEq.mockResolvedValueOnce({ error: null }); // update plan
    mockEq.mockResolvedValueOnce({ error: null }); // delete old modules
    mockInsert.mockResolvedValueOnce({ error: null }); // insert new modules

    const res = await request(app)
      .put("/api/admin/plans/123")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`)
      .send({
        title: "Updated Plan",
        description: "Updated Desc",
        moduleIds: [3]
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Plan updated successfully.");
  });
});

describe("DELETE /api/admin/plans/:id", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-admin-jwt-secret-key",
    { expiresIn: "1h" }
  );

  it("deletes a plan successfully", async () => {
    mockEq.mockResolvedValueOnce({ error: null }); // delete plan

    const res = await request(app)
      .delete("/api/admin/plans/123")
      .set("Cookie", adminTokenCookie())
      .set("Authorization", `Bearer ${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Plan deleted successfully.");
  });
});