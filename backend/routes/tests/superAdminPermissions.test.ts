/**
 * Tests for super_admin-only restricted exercise endpoints.
 * Verifies: admin => 403, client (no token) => 401, super_admin => success.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

import express from "express";
import request from "supertest";
import exercisesRouter from "../exercises";
import { supabaseServer } from "../../lib/supabaseServer";

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

beforeEach(() => {
  jest.clearAllMocks();

  app = express();
  app.use(express.json());
  app.use("/api/exercises", exercisesRouter);

  (supabaseServer.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest
      .fn()
      .mockResolvedValue({ data: { exercise_id: 1, title: "Test" }, error: null }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  });
});

describe("PATCH /api/exercises/:id - super_admin only", () => {
  it("super_admin returns 200", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .set("Authorization", "Bearer fake-token")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
  });

  it("admin role returns 403", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .set("Authorization", "Bearer fake-token")
      .set("x-test-admin-role", "admin")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(403);
  });

  it("no token returns 401", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/exercises/:id - super_admin only", () => {
  beforeEach(() => {
    (supabaseServer.from as jest.Mock).mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));
  });

  it("super_admin returns 204", async () => {
    const res = await request(app)
      .delete("/api/exercises/1")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(204);
  });

  it("admin role returns 403", async () => {
    const res = await request(app)
      .delete("/api/exercises/1")
      .set("Authorization", "Bearer fake-token")
      .set("x-test-admin-role", "admin");

    expect(res.status).toBe(403);
  });

  it("no token returns 401", async () => {
    const res = await request(app).delete("/api/exercises/1");

    expect(res.status).toBe(401);
  });
});