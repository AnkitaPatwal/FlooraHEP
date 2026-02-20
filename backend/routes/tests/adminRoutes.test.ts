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
