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
    { id: "user-1", email: "test@example.com" },
  ]),
  getAssignablePlans: jest.fn(async () => [
    { plan_id: 1, title: "Starter Plan" },
  ]),
  assignPackageToUser: jest.fn(async () => ({
    ok: true,
    message: "assigned",
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
      { id: "user-1", email: "test@example.com" },
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

  it("assigns package with bearer auth", async () => {
    const res = await request(app)
      .post("/api/assign-package/assign-package")
      .set("Authorization", "Bearer fake-token")
      .send({
        user_id: "user-1",
        package_id: 1,
        start_date: "2026-03-24",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      message: "assigned",
    });
  });
});