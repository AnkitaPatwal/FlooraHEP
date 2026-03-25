import request from "supertest";
import express from "express";

const fromMock = jest.fn();
const inviteUserByEmailMock = jest.fn();
const generateLinkMock = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: fromMock,
    auth: {
      admin: {
        inviteUserByEmail: inviteUserByEmailMock,
        generateLink: generateLinkMock,
      },
    },
  })),
}));

jest.mock("../adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }
    req.admin = { id: "admin-1", email: "admin@floora.com", role: "admin" };
    next();
  },

  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    const roleHeader = req.headers["x-test-admin-role"];

    req.admin = {
      id: "admin-1",
      email: "admin@floora.com",
      role: roleHeader === "admin" ? "admin" : "super_admin",
    };

    if (req.admin.role !== "super_admin") {
      return res.status(403).json({ ok: false, error: "Super admin required" });
    }

    next();
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());

  const adminRouter = require("../admin").default;
  app.use("/api/admin", adminRouter);

  return app;
}

describe("Admin invite flow", () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();

    process.env.SUPABASE_URL = "http://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test_service_key";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESET_FROM_EMAIL = "Floora HEP <onboarding@resend.dev>";
    process.env.FRONTEND_ADMIN_INVITE_URL =
      "http://localhost:5173/admin/accept-invite";
    process.env.RESEND_DEV_TO_EMAIL = "kayla.garibay31@gmail.com";

    fromMock.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({ data: null, error: null })),
          single: jest.fn(async () => ({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(async () => ({ error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({ error: null })),
      })),
    }));

    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: "invited-user-id", email: "newadmin@example.com" } },
      error: null,
    });

    generateLinkMock.mockResolvedValue({
      data: {
        properties: {
          action_link:
            "http://localhost:5173/admin/accept-invite?token=fake-token",
        },
      },
      error: null,
    });
  });

  test("POST /api/admin/invite succeeds for super admin", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/api/admin/invite")
      .set("Authorization", "Bearer fake-token")
      .send({ email: "newadmin@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("POST /api/admin/invite rejects non super admin", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/api/admin/invite")
      .set("Authorization", "Bearer fake-token")
      .set("x-test-admin-role", "admin")
      .send({ email: "newadmin@example.com" });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Super admin required/i);
  });
});