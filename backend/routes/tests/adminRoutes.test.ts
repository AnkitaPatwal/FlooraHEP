// Set environment variables FIRST (before any imports)
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.JWT_SECRET = "test-jwt-secret-key";

let app: any;

// MUST be first: mock auth before loading server
jest.mock("../../lib/adminGuard", () => {
  const handler = (req: any, res: any, next: any) => next();
  return {
    __esModule: true,
    default: handler,
    requireAdmin: handler,
  };
});

jest.mock("../../middleware/requireAdminJwt", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();
  return {
    __esModule: true,
    requireAdminJwt: passThrough,
    default: passThrough,
  };
});

import request from "supertest";
import * as moduleService from "../../services/moduleService";

beforeAll(() => {
  app = require("../../server").default;
});

describe("GET /api/admin/modules", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-jwt-secret-key-for-testing",
    { expiresIn: "1h" }
  );

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

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Cookie", `admin_token=${validAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockModules);
  });

  it("returns 500 if service throws", async () => {
    jest
      .spyOn(moduleService, "getAllModulesWithExercises")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/modules")
      .set("Cookie", `admin_token=${validAdminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch modules" });
  });
});

describe("POST /api/admin/modules", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-jwt-secret-key-for-testing",
    { expiresIn: "1h" }
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 201 with created module", async () => {
    const created = {
      module_id: 1,
      title: "Week 1",
      description: "Intro",
      session_number: 1,
      created_at: "2026-01-01T00:00:00Z",
    };
    jest.spyOn(moduleService, "createModule").mockResolvedValue(created as any);

    const res = await request(app)
      .post("/api/admin/modules")
      .set("Cookie", `admin_token=${validAdminToken}`)
      .send({ title: "Week 1", description: "Intro", session_number: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
  });

  it("returns 400 when createModule throws", async () => {
    jest
      .spyOn(moduleService, "createModule")
      .mockRejectedValue(new Error("Title is required"));

    const res = await request(app)
      .post("/api/admin/modules")
      .set("Cookie", `admin_token=${validAdminToken}`)
      .send({ title: "  ", session_number: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Title is required");
  });
});

describe("PUT /api/admin/modules/:id/exercises", () => {
  const validAdminToken = require("jsonwebtoken").sign(
    { id: "test-admin-uuid", email: "admin@test.com", role: "admin" },
    "test-jwt-secret-key-for-testing",
    { expiresIn: "1h" }
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with saved mapping", async () => {
    const result = { module_id: 1, exercise_ids: [10, 20] };
    jest
      .spyOn(moduleService, "saveModuleExercises")
      .mockResolvedValue(result as any);

    const res = await request(app)
      .put("/api/admin/modules/1/exercises")
      .set("Cookie", `admin_token=${validAdminToken}`)
      .send({ exercise_ids: [10, 20] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
  });

  it("returns 400 for invalid module id", async () => {
    const res = await request(app)
      .put("/api/admin/modules/0/exercises")
      .set("Cookie", `admin_token=${validAdminToken}`)
      .send({ exercise_ids: [1] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid module id");
  });

  it("returns 400 when saveModuleExercises throws", async () => {
    jest
      .spyOn(moduleService, "saveModuleExercises")
      .mockRejectedValue(new Error("Invalid module id"));

    const res = await request(app)
      .put("/api/admin/modules/1/exercises")
      .set("Cookie", `admin_token=${validAdminToken}`)
      .send({ exercise_ids: [1] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid module id");
  });
});
