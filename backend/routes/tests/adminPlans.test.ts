import express from "express";
import request from "supertest";
import adminRouter from "../admin";

let app: any;

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

jest.mock("../adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    req.admin = { id: "test-admin", role: "admin" };
    next();
  },

  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    req.admin = { id: "test-admin", role: "super_admin" };
    next();
  },
}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockDelete = jest.fn();
const mockOrder = jest.fn();

jest.mock("@supabase/supabase-js", () => {
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
    })),
  };
});

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
});

afterEach(() => {
  jest.clearAllMocks();
  mockInsert.mockReset();
  mockSelect.mockReset();
  mockSingle.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockDelete.mockReset();
  mockOrder.mockReset();

  mockInsert.mockReturnThis();
  mockSelect.mockReturnThis();
  mockSingle.mockReturnThis();
  mockUpdate.mockReturnThis();
  mockEq.mockReturnThis();
  mockDelete.mockReturnThis();
  mockOrder.mockReturnThis();
});

describe("POST /api/admin/plans", () => {
  it("returns 400 if title is missing", async () => {
    const res = await request(app)
      .post("/api/admin/plans")
      .set("Authorization", "Bearer fake-token")
      .send({ moduleIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Title is required/);
  });

  it("creates a plan and plan_module links successfully", async () => {
    mockInsert.mockImplementationOnce(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { plan_id: 123 }, error: null }),
      }),
    }));
    mockInsert.mockImplementationOnce(() => Promise.resolve({ error: null }));

    const res = await request(app)
      .post("/api/admin/plans")
      .set("Authorization", "Bearer fake-token")
      .send({
        title: "Test Plan",
        description: "Test Desc",
        moduleIds: [1, 2],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Plan created successfully.");
    expect(res.body.planId).toBe(123);
  });

  it("returns 500 if plan creation fails", async () => {
    mockInsert.mockImplementationOnce(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({ data: null, error: new Error("DB fail") }),
      }),
    }));

    const res = await request(app)
      .post("/api/admin/plans")
      .set("Authorization", "Bearer fake-token")
      .send({
        title: "Test Plan",
        description: "Test Desc",
        moduleIds: [],
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to create plan.");
  });
});

describe("PUT /api/admin/plans/:id", () => {
  it("updates a plan successfully", async () => {
    mockEq.mockResolvedValueOnce({ error: null });
    mockEq.mockResolvedValueOnce({ error: null });
    mockInsert.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .put("/api/admin/plans/123")
      .set("Authorization", "Bearer fake-token")
      .send({
        title: "Updated Plan",
        description: "Updated Desc",
        moduleIds: [3],
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Plan updated successfully.");
  });
});

describe("DELETE /api/admin/plans/:id", () => {
  it("deletes a plan successfully", async () => {
    mockEq.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .delete("/api/admin/plans/123")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Plan deleted successfully.");
  });
});