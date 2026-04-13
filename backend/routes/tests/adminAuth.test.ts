import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";

jest.mock("../adminAuth", () => ({
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    (req as Request & { admin?: { id: string; role: string } }).admin = {
      id: "admin-1",
      role: "admin",
    };

    next();
  },
  requireSuperAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock("../../lib/supabaseServer", () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [{ id: 1, title: "Module A" }],
      error: null,
    }),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 1, title: "Module A" },
      error: null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: 1, title: "Module A" },
      error: null,
    }),
  };

  return {
    supabaseServer: {
      from: jest.fn((table: string) => {
        if (table === "user_module") {
          return {
            select: jest.fn(() => ({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        if (
          table === "user_packages" ||
          table === "plan_module" ||
          table === "user_assignment_session"
        ) {
          return {
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return chain;
      }),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

import adminRouter from "../admin";

describe("admin route auth regression", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin", adminRouter);
  });

  it("rejects /modules without bearer auth", async () => {
    const res = await request(app).get("/api/admin/modules");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Missing authorization token",
    });
  });

  it("does not fail auth when bearer token is present", async () => {
    const res = await request(app)
      .get("/api/admin/modules")
      .set("Authorization", "Bearer fake-token");
  
    expect(res.status).not.toBe(401);
    expect(res.body).not.toEqual({
      ok: false,
      error: "Missing authorization token",
    });
  });
});