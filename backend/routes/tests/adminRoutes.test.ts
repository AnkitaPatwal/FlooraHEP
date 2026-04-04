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
    jest
      .spyOn(moduleService, "attachAssignedUserCountsToModules")
      .mockImplementation(async (_c, mods) => {
        for (const m of mods) (m as { assigned_user_count?: number }).assigned_user_count = 0;
      });

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { module_id: 1, title: "Week 1", module_exercise: [], assigned_user_count: 0 },
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