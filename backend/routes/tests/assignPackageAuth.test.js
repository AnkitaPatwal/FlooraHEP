const express = require("express");
const request = require("supertest");

jest.mock("../adminAuth", () => ({
  requireAdmin: (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    req.admin = { id: "admin-1", role: "admin" };
    next();
  },
}));

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {},
}));

jest.mock("../../services/relationshipService", () => ({
  getAssignableUsers: jest.fn(async () => [
    { id: "user-1", email: "test@example.com", full_name: "Test User" },
  ]),
  getAssignablePlans: jest.fn(async () => [
    { plan_id: 1, title: "Starter Plan" },
  ]),
  assignPackageToUser: jest.fn(async () => ({
    success: true,
    assignment_id: "assign-new-1",
  })),
  parseAssignStartDate: jest.fn((value) => value || "2026-03-24"),
}));

const assignPackageRouterModule = require("../assignPackage");
const assignPackageRouter =
  assignPackageRouterModule.default || assignPackageRouterModule;

describe("assignPackage auth regression", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/assign-package", assignPackageRouter);
  });

  it("rejects requests without bearer auth", async () => {
    const res = await request(app).get("/api/assign-package/users");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Missing authorization token",
    });
  });

  it("loads users with bearer auth", async () => {
    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "user-1", email: "test@example.com", full_name: "Test User" },
    ]);
  });

  it("loads plans with bearer auth", async () => {
    const res = await request(app)
      .get("/api/assign-package/plans")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { plan_id: 1, title: "Starter Plan" },
    ]);
  });

  it("assigns package with bearer auth (defer layout: no DB materialize in this mock env)", async () => {
    const res = await request(app)
      .post("/api/assign-package/assign-package")
      .set("Authorization", "Bearer fake-token")
      .send({
        user_id: "user-1",
        package_id: 1,
        start_date: "2026-03-24",
        defer_session_layout: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      assignment_id: "assign-new-1",
    });
  });

  it("loads assigned packages for a user", async () => {
    const { supabaseServer } = require("../../lib/supabaseServer");

    const userPackagesChain = {
      select: jest.fn(() => userPackagesChain),
      eq: jest.fn(() => userPackagesChain),
      order: jest.fn(async () => ({
        data: [
          {
            id: "up-1",
            package_id: 1,
            start_date: "2026-03-24",
            created_at: "2026-03-24T00:00:00Z",
            session_layout_published_at: "2026-03-24T00:00:00Z",
          },
        ],
        error: null,
      })),
    };

    const planChain = {
      select: jest.fn(() => planChain),
      in: jest.fn(async () => ({
        data: [{ plan_id: 1, title: "Starter Plan" }],
        error: null,
      })),
    };

    supabaseServer.from = jest.fn((table) => {
      if (table === "user_packages") return userPackagesChain;
      if (table === "plan") return planChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await request(app)
      .get("/api/assign-package/users/user-1/packages")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: "up-1",
        package_id: 1,
        title: "Starter Plan",
        start_date: "2026-03-24",
        created_at: "2026-03-24T00:00:00Z",
        session_layout_published_at: "2026-03-24T00:00:00Z",
      },
    ]);
  });
});