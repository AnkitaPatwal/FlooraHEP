import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

let fromMock: jest.Mock;

// Mock supabase client creation at module load time
jest.mock("@supabase/supabase-js", () => {
  fromMock = jest.fn();
  return {
    createClient: jest.fn(() => ({
      from: fromMock,
    })),
  };
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Import router after env is set in each test
  const adminRouter = require("../admin").default;
  app.use("/api/admin", adminRouter);

  return app;
}

describe("Admin invite flow", () => {
  // The email invite path does some crypto + template work; give it extra time under Jest.
  jest.setTimeout(15000);
  const ADMIN_JWT_SECRET = "test_admin_secret";

  beforeEach(() => {
    jest.resetAllMocks();

    // Ensure env is set before router import
    process.env.SUPABASE_URL = "http://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test_service_key";
    process.env.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;

    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESET_FROM_EMAIL = "Floora HEP <onboarding@resend.dev>";
    process.env.FRONTEND_ADMIN_INVITE_URL = "http://localhost:5173/admin/accept-invite";
    process.env.RESEND_DEV_TO_EMAIL = "kayla.garibay31@gmail.com";

    // Clear module cache so admin router re-reads env
    jest.resetModules();

    // Mock Resend call
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      text: async () => "",
      json: async () => ({}),
    }));
  });

  function adminCookie(payload: any) {
    const token = jwt.sign(payload, ADMIN_JWT_SECRET);
    return `admin_token=${token}`;
  }

  test("POST /api/admin/invite sends email to RESEND_DEV_TO_EMAIL when set", async () => {
    const app = makeApp();

    const cookie = adminCookie({ email: "super@floora.com", role: "super_admin" });

    const res = await request(app)
      .post("/api/admin/invite")
      .set("Cookie", cookie)
      .send({ email: "newadmin@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (global as any).fetch.mock.calls[0];
    const url = fetchArgs[0];
    const options = fetchArgs[1];

    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);

    // Key dev constraint assertion
    expect(body.to).toBe(process.env.RESEND_DEV_TO_EMAIL);
    expect(body.from).toBe(process.env.RESET_FROM_EMAIL);
    expect(body.subject).toContain("invited");
    expect(body.html).toContain("Accept invite");
    expect(body.html).toContain(process.env.FRONTEND_ADMIN_INVITE_URL as string);
  });

  test("POST /api/admin/invite rejects non super admin", async () => {
    const app = makeApp();

    const cookie = adminCookie({ email: "admin@floora.com", role: "admin" });

    const res = await request(app)
      .post("/api/admin/invite")
      .set("Cookie", cookie)
      .send({ email: "newadmin@example.com" });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Super admin required/i);
  });

  test("POST /api/admin/accept-invite creates admin user when token valid", async () => {
    const app = makeApp();

    // Mock supabase chain for accept-invite:
    // from("admin_users").select().eq().maybeSingle()
    // from("admin_users").insert(...)
    const maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    const insert = jest.fn(async () => ({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === "admin_users") return { select, insert };
      throw new Error(`Unexpected table: ${table}`);
    });

    const inviteToken = jwt.sign(
      { type: "admin_invite", email: "invited@floora.com" },
      ADMIN_JWT_SECRET,
      { expiresIn: "24h" }
    );

    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token: inviteToken, password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(fromMock).toHaveBeenCalledWith("admin_users");
    expect(select).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);

    const insertMock = insert as unknown as jest.Mock;
    const insertArg = insertMock.mock.calls[0][0] as any;

    expect(insertArg.email).toBe("invited@floora.com");
    expect(insertArg.role).toBe("admin");
    expect(insertArg.is_active).toBe(true);
    expect(typeof insertArg.password_hash).toBe("string");
    expect(insertArg.password_hash.length).toBeGreaterThan(10);
  });

  test("POST /api/admin/accept-invite returns 409 if admin already exists", async () => {
    const app = makeApp();

    const maybeSingle = jest.fn(async () => ({ data: { email: "invited@floora.com" }, error: null }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    const insert = jest.fn(async () => ({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === "admin_users") return { select, insert };
      throw new Error(`Unexpected table: ${table}`);
    });

    const inviteToken = jwt.sign(
      { type: "admin_invite", email: "invited@floora.com" },
      ADMIN_JWT_SECRET,
      { expiresIn: "24h" }
    );

    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token: inviteToken, password: "Password123!" });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
    expect(insert).not.toHaveBeenCalled();
  });

  test("POST /api/admin/accept-invite returns 401 on invalid token", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token: "not-a-jwt", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Invalid or expired/i);
  });

  test("POST /api/admin/accept-invite returns 401 on expired token", async () => {
    jest.useFakeTimers();

    const app = makeApp();

    const inviteToken = jwt.sign(
      { type: "admin_invite", email: "invited@floora.com" },
      ADMIN_JWT_SECRET,
      { expiresIn: "1s" }
    );

    jest.advanceTimersByTime(2000);

    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token: inviteToken, password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/expired/i);

    jest.useRealTimers();
  });

  test("POST /api/admin/accept-invite returns 400 when missing token", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ password: "Password123!" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Missing invite token/i);
  });
});