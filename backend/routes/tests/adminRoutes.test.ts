import request from "supertest";
import * as moduleService from "../../services/moduleService";

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

const emptyData = { data: [] as unknown[], error: null };

/** PostgREST builders are thenable; any await on the chain resolves to emptyData. */
function mockQueryChain(): any {
  const self: any = {
    select: jest.fn(() => self),
    in: jest.fn(() => self),
    is: jest.fn(() => self),
    limit: jest.fn(() => self),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(emptyData).then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) =>
      Promise.resolve(emptyData).catch(onRejected),
  };
  return self;
}

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    from: jest.fn((_table: string) => mockQueryChain()),
  },
}));

import express from "express";
import adminRouter from "../admin";

let app: any;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
});

describe("GET /api/admin/modules", () => {
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
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { ...mockModules[0], assigned_user_count: 0 },
    ]);
  });

  it("returns 500 if service throws", async () => {
    jest
      .spyOn(moduleService, "getAllModulesWithExercises")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch modules" });
  });
});