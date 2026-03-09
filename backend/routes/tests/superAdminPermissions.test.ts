/**
 * Tests for super_admin-only restricted endpoints.
 * Verifies: admin => 403, client (no token) => 401, super_admin => success.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret";

import request from "supertest";
import app from "../../server";
import { supabaseServer } from "../../lib/supabaseServer";
import jwt from "jsonwebtoken";

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock("@supabase/supabase-js", () => {
  const actualSupabase = jest.requireActual("@supabase/supabase-js");
  return {
    ...actualSupabase,
    createClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === "admin_users") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((_column: string, value: string) => ({
                maybeSingle: jest.fn(() => {
                  if (value === "admin-uuid-123") {
                    return Promise.resolve({
                      data: { id: "admin-uuid-123", email: "superadmin@test.com", role: "super_admin", is_active: true },
                      error: null,
                    });
                  }
                  if (value === "admin-uuid-456") {
                    return Promise.resolve({
                      data: { id: "admin-uuid-456", email: "admin@test.com", role: "admin", is_active: true },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
              })),
            })),
          };
        }
        return actualSupabase.createClient().from(table);
      }),
      auth: { persistSession: false },
    })),
  };
});

const ADMIN_JWT_SECRET = "test-admin-jwt-secret";

function makeToken(role: string, id = "admin-uuid-123") {
  return jwt.sign(
    { id, email: "admin@test.com", role, name: "Test Admin" },
    ADMIN_JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const superAdminToken = makeToken("super_admin");
const adminToken = makeToken("admin", "admin-uuid-456");

beforeEach(() => {
  jest.clearAllMocks();
  (supabaseServer.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: { exercise_id: 1, title: "Test" }, error: null }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  });
});

describe("PATCH /api/exercises/:id — super_admin only", () => {
  it("super_admin returns 200", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .set("Cookie", `admin_token=${superAdminToken}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
  });

  it("admin role returns 403", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .set("Cookie", `admin_token=${adminToken}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(403);
  });

  it("no token (client) returns 401", async () => {
    const res = await request(app)
      .patch("/api/exercises/1")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/exercises/:id — super_admin only", () => {
  beforeEach(() => {
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      return chain;
    });
  });

  it("super_admin returns 204", async () => {
    const res = await request(app)
      .delete("/api/exercises/1")
      .set("Cookie", `admin_token=${superAdminToken}`);

    expect(res.status).toBe(204);
  });

  it("admin role returns 403", async () => {
    const res = await request(app)
      .delete("/api/exercises/1")
      .set("Cookie", `admin_token=${adminToken}`);

    expect(res.status).toBe(403);
  });

  it("no token (client) returns 401", async () => {
    const res = await request(app).delete("/api/exercises/1");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/assign-admin-role — super_admin only", () => {
  it("admin role returns 403", async () => {
    const res = await request(app)
      .post("/api/admin/assign-admin-role")
      .set("Cookie", `admin_token=${adminToken}`)
      .send({ email: "newadmin@test.com" });

    expect(res.status).toBe(403);
  });

  it("no token (client) returns 401", async () => {
    const res = await request(app)
      .post("/api/admin/assign-admin-role")
      .send({ email: "newadmin@test.com" });

    expect(res.status).toBe(401);
  });
});
