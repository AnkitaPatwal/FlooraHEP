// ─────────────────────────────────────────────────────────────
// MUST be the very first lines in the file (no imports above)
// ─────────────────────────────────────────────────────────────
jest.mock("../../lib/adminGuard", () => {
  // a single handler used for both default and named exports
  const handler = (req: any, res: any, next: any) => {
    // if handlers expect req.user, you can attach a fake user here:
    // req.user = { id: "test", roles: ["admin"] };
    next();
  };

  // Cover multiple export styles so the mock always supplies a function:
  // - CommonJS: module.exports = handler
  // - ES default: export default handler
  // - Named export: export const requireAdmin = handler
  return {
    __esModule: true,
    default: handler,
    requireAdmin: handler,
    // Also export the handler itself as module.exports in case of require()
    // (Jest converts the return into the mocked module)
  };
});

import request from "supertest";
import app from "../../server";
import * as moduleService from "../../services/moduleService";

describe("GET /api/admin/modules", () => {

  it("returns 200 with modules", async () => {
    const mockModules = [
      { module_id: 1, title: "Week 1", module_exercise: [] }
    ];

    jest.spyOn(moduleService, "getAllModulesWithExercises")
      .mockResolvedValue(mockModules as any);

    const res = await request(app)
      .get("/api/admin/modules");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockModules);
  });

  it("returns 500 if service throws", async () => {
    jest.spyOn(moduleService, "getAllModulesWithExercises")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/modules");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch modules" });
  });

});
