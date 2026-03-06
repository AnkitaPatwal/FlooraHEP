let app: any;

// MUST be first: mock auth middleware before loading server/routes
jest.mock("../../middleware/requireAdminJwt", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();

  return {
    __esModule: true,
    requireAdminJwt: passThrough,
    default: passThrough,
  };
});

jest.mock("../../lib/adminGuard", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();

  return {
    __esModule: true,
    requireAdmin: passThrough,
    default: passThrough,
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