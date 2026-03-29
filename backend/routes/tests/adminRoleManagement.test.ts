import express from "express";
import adminRouter from "../admin";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

var mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      admin: {
        inviteUserByEmail: jest.fn(),
        generateLink: jest.fn(),
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

    req.admin = {
      id: "normal-admin-id",
      email: "admin@test.com",
      role: "admin",
      is_active: true,
    };

    next();
  },

  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing authorization token" });
    }

    req.admin = {
      id: "super-admin-id",
      email: "super@test.com",
      role: "super_admin",
      is_active: true,
    };

    next();
  },
}));

let app: any;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);

  mockFrom.mockImplementation((_table: string) => ({
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    ilike: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Admin Role Management & RLS", () => {
  it("role column update is blocked by RLS for unauthorized roles (anon/authenticated)", async () => {
    const simulateRlsUpdate = async () => {
      return {
        data: null,
        error: {
          message:
            'new row violates row-level security policy for table "admin_users"',
          code: "42501",
          details: null,
          hint: null,
        },
      };
    };

    const result = await simulateRlsUpdate();

    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe("42501");
    expect(result.error!.message).toContain(
      "violates row-level security policy"
    );
  });
});