// Set environment variables before loading modules
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret-key";

const mockGetUser = jest.fn();

// Mock @supabase/supabase-js before loading any modules
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import express from "express";
import request from "supertest";

let requireAdmin: any;
let requireSuperAdmin: any;

beforeAll(() => {
  const adminAuth = require("../../routes/adminAuth");
  requireAdmin = adminAuth.requireAdmin;
  requireSuperAdmin = adminAuth.requireSuperAdmin;
});

afterEach(() => jest.clearAllMocks());

function buildApp(middleware: any[]) {
  const app = express();
  app.use(express.json());
  app.get(
    "/test",
    ...middleware,
    (_req: express.Request, res: express.Response) => {
      res.status(200).json({ ok: true });
    }
  );
  return app;
}

describe("requireAdmin middleware", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const app = buildApp([requireAdmin]);
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/log in/i);
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = buildApp([requireAdmin]);
    const res = await request(app)
      .get("/test")
      .set("Authorization", "Basic sometoken");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid token" },
    });
    const app = buildApp([requireAdmin]);
    const res = await request(app)
      .get("/test")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("returns 200 and attaches admin to request when token is valid", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "uuid-123",
          email: "admin@floora.com",
          user_metadata: { role: "admin" },
        },
      },
      error: null,
    });

    const app = express();
    app.use(express.json());
    app.get("/test", requireAdmin, (req: any, res: express.Response) => {
      res.status(200).json({ admin: req.admin });
    });

    const res = await request(app)
      .get("/test")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe("admin@floora.com");
    expect(res.body.admin.role).toBe("admin");
  });
});

describe("requireSuperAdmin middleware", () => {
  it("returns 401 when no admin context on request", async () => {
    const app = buildApp([requireSuperAdmin]);
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is admin not super_admin", async () => {
    const app = express();
    app.use(express.json());
    app.get(
      "/test",
      (req: any, _res: express.Response, next: express.NextFunction) => {
        req.admin = { id: "uuid-123", email: "admin@floora.com", role: "admin" };
        next();
      },
      requireSuperAdmin,
      (_req: express.Request, res: express.Response) => {
        res.status(200).json({ ok: true });
      }
    );
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Super admin access required/i);
  });

  it("returns 200 when role is super_admin", async () => {
    const app = express();
    app.use(express.json());
    app.get(
      "/test",
      (req: any, _res: express.Response, next: express.NextFunction) => {
        req.admin = { id: "uuid-123", email: "super@floora.com", role: "super_admin" };
        next();
      },
      requireSuperAdmin,
      (_req: express.Request, res: express.Response) => {
        res.status(200).json({ ok: true });
      }
    );
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });
});