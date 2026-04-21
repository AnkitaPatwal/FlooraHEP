const express = require("express");
const request = require("supertest");

jest.mock("../adminAuth", () => ({
  requireAdmin: (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing authorization token" });
    }
    req.admin = { id: "admin-1", role: "admin" };
    next();
  },
}));

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {},
}));

const assignPackageRouterModule = require("../assignPackage");
const assignPackageRouter = assignPackageRouterModule.default || assignPackageRouterModule;

function chainMaybeSingle({ data, error = null }) {
  return {
    select: jest.fn(function () { return this; }),
    eq: jest.fn(function () { return this; }),
    is: jest.fn(function () { return this; }),
    maybeSingle: jest.fn(async () => ({ data, error })),
  };
}

function chainEqResolve({ data, error = null }) {
  // Mimic: await from(table).select(...).eq(...).eq(...)
  const resolve = jest.fn(async () => ({ data, error }));
  const eq2 = jest.fn(() => ({ then: (onFulfilled) => resolve().then(onFulfilled) }));
  // Jest/Node awaits "thenables" too; returning a thenable object works.
  const eq1 = jest.fn(() => ({ eq: eq2, then: (onFulfilled) => resolve().then(onFulfilled) }));
  const select = jest.fn(() => ({ eq: eq1 }));
  return { select, eq1, eq2, resolve };
}

describe("assignPackage exercises endpoints", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/assign-package", assignPackageRouter);
  });

  it("GET session exercises allows added session (not in plan_module)", async () => {
    const { supabaseServer } = require("../../lib/supabaseServer");

    // Call order within route:
    // 1) user_packages (getUserPackageAssignment)
    // 2) plan_module pmCheck (returns null)
    // 3) user_assignment_session uasCheck (returns row)
    // 4) module_exercise list
    // 5) user_assignment_exercise list

    const upChain = {
      select: jest.fn(() => upChain),
      eq: jest.fn(() => upChain),
      maybeSingle: jest.fn(async () => ({
        data: {
          id: 123,
          user_id: "u1",
          package_id: 2,
          start_date: null,
          created_at: null,
          session_layout_published_at: null,
        },
        error: null,
      })),
    };

    const pmCheckChain = chainMaybeSingle({ data: null });
    const uasCheckChain = chainMaybeSingle({ data: { user_assignment_session_id: "uas-1" } });

    const moduleExerciseChain = {
      select: jest.fn(() => moduleExerciseChain),
      eq: jest.fn(() => moduleExerciseChain),
      order: jest.fn(async () => ({ data: [], error: null })),
    };
    const userAssignmentExerciseChain = chainEqResolve({ data: [] });

    supabaseServer.from = jest.fn((table) => {
      if (table === "user_packages") return upChain;
      if (table === "plan_module") return pmCheckChain;
      if (table === "user_assignment_session") return uasCheckChain;
      if (table === "module_exercise") return moduleExerciseChain;
      if (table === "user_assignment_exercise") return userAssignmentExerciseChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await request(app)
      .get("/api/assign-package/users/u1/assignments/123/sessions/999/exercises")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module_id: 999, exercises: [] });
    expect(supabaseServer.from).toHaveBeenCalledWith("user_assignment_session");
  });

  it("POST add exercise restores removed template exercise instead of erroring", async () => {
    const { supabaseServer } = require("../../lib/supabaseServer");

    const upChain = {
      select: jest.fn(() => upChain),
      eq: jest.fn(() => upChain),
      maybeSingle: jest.fn(async () => ({
        data: {
          id: 123,
          user_id: "u1",
          package_id: 2,
          start_date: null,
          created_at: null,
          session_layout_published_at: null,
        },
        error: null,
      })),
    };

    const pmCheckChain = chainMaybeSingle({ data: { plan_module_id: 55 } }); // module is in template

    const meDupChain = chainMaybeSingle({ data: { module_exercise_id: 777 } }); // exercise is in template

    const existingOverrideChain = chainMaybeSingle({
      data: { user_assignment_exercise_id: "uax-1", is_removed: true },
    });

    const updateChain = {
      update: jest.fn(() => updateChain),
      eq: jest.fn(() => updateChain),
    };
    updateChain.eq.mockResolvedValue({ data: [{ user_assignment_exercise_id: "uax-1" }], error: null });

    let uaxFromCount = 0;
    supabaseServer.from = jest.fn((table) => {
      if (table === "user_packages") return upChain;
      if (table === "plan_module") return pmCheckChain;
      if (table === "module_exercise") return meDupChain;
      if (table === "user_assignment_exercise") {
        // First: check existing override; second: update restore
        const call = uaxFromCount++;
        if (call === 0) return existingOverrideChain;
        return updateChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await request(app)
      .post("/api/assign-package/users/u1/assignments/123/sessions/1/exercises")
      .set("Authorization", "Bearer fake-token")
      .send({ exercise_id: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, restored_template: true });
    expect(updateChain.update).toHaveBeenCalledWith({ is_removed: false });
  });
});

