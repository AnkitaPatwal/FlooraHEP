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
      return res.status(401).json({ ok: false, error: "Missing authorization token" });
    }
    req.admin = { id: "test-admin", role: "admin" };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing authorization token" });
    }
    req.admin = { id: "test-admin", role: "super_admin" };
    next();
  },
}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
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
        maybeSingle: mockMaybeSingle.mockReturnThis(),
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
  mockMaybeSingle.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockDelete.mockReset();
  mockOrder.mockReset();

  mockInsert.mockReturnThis();
  mockSelect.mockReturnThis();
  mockSingle.mockReturnThis();
  mockMaybeSingle.mockReturnThis();
  mockUpdate.mockReturnThis();
  mockEq.mockReturnThis();
  mockDelete.mockReturnThis();
  mockOrder.mockReturnThis();
});

describe("PUT /api/admin/modules/:id", () => {
  it("updates module fields", async () => {
    mockEq.mockReturnThis();
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        module_id: 12,
        title: "New",
        description: "",
        category: "Mobility",
        session_number: 3,
      },
      error: null,
    });

    const res = await request(app)
      .put("/api/admin/modules/12")
      .set("Authorization", "Bearer fake-token")
      .send({ title: " New ", category: "Mobility", session_number: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      module_id: 12,
      title: "New",
      description: "",
      category: "Mobility",
      session_number: 3,
    });
  });

  it("returns 400 when no fields provided", async () => {
    const res = await request(app)
      .put("/api/admin/modules/12")
      .set("Authorization", "Bearer fake-token")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No fields provided/);
  });
});

describe("DELETE /api/admin/modules/:id", () => {
  it("deletes module and dependencies", async () => {
    // Dependency deletes: each returns { error: null }
    mockEq.mockResolvedValue({ error: null });

    const res = await request(app)
      .delete("/api/admin/modules/55")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

