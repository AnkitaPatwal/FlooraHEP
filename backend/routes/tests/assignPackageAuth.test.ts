import express from "express";
import request from "supertest";
import assignPackageRouter from "../assignPackage";
import { supabaseServer } from "../../lib/supabaseServer";
import {
  getAssignableUsers,
  getAssignablePlans,
  assignPackageToUser,
} from "../../services/relationshipService";

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

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/assign-package", assignPackageRouter);
  return app;
}

function mockAdminLookup(adminUser: any, error: any = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: adminUser, error });
  const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
  const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond, maybeSingle });

  (mockedSupabaseServer.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: eqFirst,
      maybeSingle,
    }),
  });

  return { maybeSingle, eqFirst, eqSecond };
}

describe("assignPackage auth protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const app = makeApp();

    const res = await request(app).get("/api/assign-package/users");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Missing authorization token",
    });
    expect(mockedSupabaseServer.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer fake123");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: "Invalid or expired token",
    });
    expect(mockedSupabaseServer.auth.getUser).toHaveBeenCalledWith("fake123");
  });

  it("returns 403 when authenticated user is not in admin_users", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "student@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup(null, null);

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: "Forbidden",
    });
  });

  it("returns 403 when authenticated user role is not admin or super_admin", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "client@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup({
      id: "admin-row-2",
      email: "client@example.com",
      role: "viewer",
      is_active: true,
      name: "Client User",
    });

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer valid-viewer-token");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: "Forbidden",
    });
  });

  it("returns 403 when admin account is inactive", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-3",
          email: "inactiveadmin@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup({
      id: "admin-row-3",
      email: "inactiveadmin@example.com",
      role: "admin",
      is_active: false,
      name: "Inactive Admin",
    });

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer inactive-admin-token");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: "Admin account is disabled",
    });
  });

  it("allows admin user to access protected users route", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-4",
          email: "admin@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup({
      id: "admin-row-4",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      name: "Admin User",
    });

    mockedGetAssignableUsers.mockResolvedValue([
      { id: "u1", email: "client1@example.com" },
    ] as any);

    const res = await request(app)
      .get("/api/assign-package/users")
      .set("Authorization", "Bearer valid-admin-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "u1", email: "client1@example.com" },
    ]);
    expect(mockedGetAssignableUsers).toHaveBeenCalled();
  });

  it("allows super_admin user to access protected plans route", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-5",
          email: "superadmin@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup({
      id: "admin-row-5",
      email: "superadmin@example.com",
      role: "super_admin",
      is_active: true,
      name: "Super Admin",
    });

    mockedGetAssignablePlans.mockResolvedValue([
      { id: 1, name: "Starter Plan" },
    ] as any);

    const res = await request(app)
      .get("/api/assign-package/plans")
      .set("Authorization", "Bearer valid-super-admin-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Starter Plan" },
    ]);
    expect(mockedGetAssignablePlans).toHaveBeenCalled();
  });

  it("allows admin user to assign package", async () => {
    const app = makeApp();

    (mockedSupabaseServer.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: "user-6",
          email: "admin@example.com",
        },
      },
      error: null,
    });

    mockAdminLookup({
      id: "admin-row-6",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      name: "Admin User",
    });

    mockedAssignPackageToUser.mockResolvedValue({ success: true } as any);

    const res = await request(app)
      .post("/api/assign-package/assign-package")
      .set("Authorization", "Bearer valid-admin-token")
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