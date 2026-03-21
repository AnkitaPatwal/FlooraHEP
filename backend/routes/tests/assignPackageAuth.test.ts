import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import request from "supertest";
import assignPackageRouter from "../assignPackage";
import { supabaseServer } from "../../lib/supabaseServer";
import {
  getAssignableUsers,
  getAssignablePlans,
  assignPackageToUser,
} from "../../services/relationshipService";

process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "test-assign-package-secret";

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../../services/relationshipService", () => {
  const actual = jest.requireActual<typeof import("../../services/relationshipService")>(
    "../../services/relationshipService"
  );
  return {
    ...actual,
    getAssignableUsers: jest.fn(),
    getAssignablePlans: jest.fn(),
    assignPackageToUser: jest.fn(),
  };
});

const mockedSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>;
const mockedGetAssignableUsers = getAssignableUsers as jest.MockedFunction<typeof getAssignableUsers>;
const mockedGetAssignablePlans = getAssignablePlans as jest.MockedFunction<typeof getAssignablePlans>;
const mockedAssignPackageToUser = assignPackageToUser as jest.MockedFunction<typeof assignPackageToUser>;

function adminCookie(role: "admin" | "super_admin" = "admin") {
  const token = jwt.sign(
    { id: "admin-row-1", email: "admin@example.com", role },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return `admin_token=${token}`;
}

function makeApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/assign-package", assignPackageRouter);
  return app;
}

describe("assignPackage cookie auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when admin_token cookie is missing", async () => {
    const app = makeApp();

    const res = await request(app).get("/api/assign-package/users");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Missing authorization token",
    });
    expect(mockedGetAssignableUsers).not.toHaveBeenCalled();
  });

  it("returns 401 when cookie token is invalid", async () => {
    const app = makeApp();

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Cookie", "admin_token=not-a-jwt");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Invalid or expired token",
    });
  });

  it("allows admin to fetch assignable users", async () => {
    const app = makeApp();

    mockedGetAssignableUsers.mockResolvedValue([
      { id: "u1", email: "client1@example.com" },
    ] as any);

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Cookie", adminCookie("admin"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "u1", email: "client1@example.com" }]);
    expect(mockedGetAssignableUsers).toHaveBeenCalledWith(mockedSupabaseServer);
  });

  it("allows super_admin to fetch plans", async () => {
    const app = makeApp();

    mockedGetAssignablePlans.mockResolvedValue([
      { plan_id: 1, title: "Starter Plan" },
    ] as any);

    const res = await request(app)
      .get("/api/assign-package/plans")
      .set("Cookie", adminCookie("super_admin"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ plan_id: 1, title: "Starter Plan" }]);
    expect(mockedGetAssignablePlans).toHaveBeenCalledWith(mockedSupabaseServer);
  });

  it("allows admin to assign package with start_date", async () => {
    const app = makeApp();

    mockedAssignPackageToUser.mockResolvedValue({ success: true } as any);

    const res = await request(app)
      .post("/api/assign-package/assign-package")
      .set("Cookie", adminCookie("admin"))
      .send({
        user_id: "19",
        package_id: 2,
        start_date: "2026-03-21",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockedAssignPackageToUser).toHaveBeenCalledWith(
      mockedSupabaseServer,
      "19",
      2,
      "2026-03-21"
    );
  });
});
