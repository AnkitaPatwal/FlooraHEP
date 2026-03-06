// Set environment variables FIRST (before any imports)
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_JWT_SECRET = "test-jwt-secret-key-for-testing";

let app: any;

jest.mock("../../lib/adminGuard", () => {
  const handler = (req: any, res: any, next: any) => {
    next();
  };

  return {
    __esModule: true,
    default: handler,
    requireAdmin: handler,
  };
});

jest.mock("../../middleware/requireAdminJwt", () => {
  const handler = (req: any, res: any, next: any) => next();
  return {
    __esModule: true,
    requireAdminJwt: handler,
    default: handler,
  };
});

import request from "supertest";
import * as moduleService from "../../services/moduleService";

beforeAll(() => {
  // load server only AFTER mocks are in place
  app = require("../../server").default;
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

    const res = await request(app).get("/api/admin/modules");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockModules);
  });

  it("returns 500 if service throws", async () => {
    jest
      .spyOn(moduleService, "getAllModulesWithExercises")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/api/admin/modules");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch modules" });
  });
});