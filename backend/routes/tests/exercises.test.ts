import express from "express";
import request from "supertest";
import exercisesRouter from "../exercises";
import { supabaseServer } from "../../lib/supabaseServer";
import { createSignedUrl } from "../../lib/signedUrl";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.LOCAL_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

let app: any;

jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: {
    from: jest.fn(),
    rpc: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock("../../lib/signedUrl", () => ({
  createSignedUrl: jest.fn(),
}));

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use("/api/exercises", exercisesRouter);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/exercises", () => {
  it("returns 200 with exercises list and assigned_user_count from RPC merge count", async () => {
    const mockExercises = [
      {
        exercise_id: 1,
        title: "Pelvic Tilt",
        description: "Gentle pelvic floor exercise",
        video_id: 1,
        video: {
          bucket: "exercise-videos",
          object_key: "test.mp4",
        },
      },
    ];

    const mockChain = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockExercises,
        error: null,
        count: 1,
      }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnValue(mockChain),
    }));

    (supabaseServer.rpc as jest.Mock).mockResolvedValue({
      data: [{ exercise_id: 1, client_count: 2 }],
      error: null,
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(
      "https://signed-url.com/video.mp4"
    );

    const res = await request(app).get("/api/exercises");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Pelvic Tilt");
    expect(res.body.data[0].video_url).toBe("https://signed-url.com/video.mp4");
    expect(res.body.data[0].assigned_user_count).toBe(2);
    expect(supabaseServer.rpc).toHaveBeenCalledWith("count_assigned_clients_for_exercises", {
      p_exercise_ids: [1],
    });
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      assignmentCountsError: false,
      assignmentCountsRpcUnavailable: false,
    });
  });

  it("supports search query parameter", async () => {
    const mockChain = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnValue(mockChain),
    }));

    (createSignedUrl as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/exercises?search=pelvic");

    expect(res.status).toBe(200);
    expect(supabaseServer.from).toHaveBeenCalledWith("exercise");
    expect(mockChain.or).toHaveBeenCalled();
    expect(res.body.meta.assignmentCountsError).toBe(false);
    expect(res.body.meta.assignmentCountsRpcUnavailable).toBe(false);
    expect(supabaseServer.rpc).not.toHaveBeenCalled();
  });

  it("sets assignmentCountsError and null counts when RPC and legacy user_exercise fail", async () => {
    const mockExercises = [
      {
        exercise_id: 10,
        title: "Test",
        video_id: null,
        video: null,
      },
    ];

    const mockChain = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockExercises,
        error: null,
        count: 1,
      }),
    };

    (supabaseServer.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "user_exercise") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "rls" },
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue(mockChain),
      };
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/exercises");

    expect(res.status).toBe(200);
    expect(res.body.data[0].assigned_user_count).toBeNull();
    expect(res.body.meta.assignmentCountsError).toBe(true);
    expect(res.body.meta.assignmentCountsRpcUnavailable).toBe(true);
  });

  it("marks RPC unavailable but returns legacy counts when user_exercise succeeds after RPC fails", async () => {
    const mockExercises = [
      { exercise_id: 11, title: "Legacy", video_id: null, video: null },
    ];

    const mockChain = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockExercises,
        error: null,
        count: 1,
      }),
    };

    (supabaseServer.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "user_exercise") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ exercise_id: 11 }, { exercise_id: 11 }],
              error: null,
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue(mockChain),
      };
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/exercises");

    expect(res.status).toBe(200);
    expect(res.body.data[0].assigned_user_count).toBe(2);
    expect(res.body.meta.assignmentCountsError).toBe(false);
    expect(res.body.meta.assignmentCountsRpcUnavailable).toBe(true);
  });

  it("returns 500 on database error", async () => {
    const mockChain = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
        count: null,
      }),
    };

    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(mockChain),
    });

    const res = await request(app).get("/api/exercises");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Failed to fetch exercises" });
  });
});

describe("GET /api/exercises/by-module/:moduleId", () => {
  it("does not treat 'by-module' as exercise :id (regression)", async () => {
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "module_exercise") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ exercise_id: 7, order_index: 1 }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "exercise") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  exercise_id: 7,
                  title: "From module",
                  video_url: null,
                  video: null,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/exercises/by-module/3");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].exercise_id).toBe(7);
    expect(res.body.data[0].title).toBe("From module");
  });
});

describe("GET /api/exercises/:id", () => {
  it("returns 200 with single exercise and assigned_user_count", async () => {
    const mockExercise = {
      exercise_id: 1,
      title: "Pelvic Tilt",
      description: "Gentle exercise",
      video_id: 1,
      video: { bucket: "exercise-videos", object_key: "test.mp4" },
    };

    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockExercise,
            error: null,
          }),
        }),
      }),
    });

    (supabaseServer.rpc as jest.Mock).mockResolvedValue({
      data: [{ exercise_id: 1, client_count: 4 }],
      error: null,
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(
      "https://signed-url.com/video.mp4"
    );

    const res = await request(app).get("/api/exercises/1");

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Pelvic Tilt");
    expect(res.body.video_url).toBe("https://signed-url.com/video.mp4");
    expect(res.body.assigned_user_count).toBe(4);
    expect(res.body.assigned_count_rpc_unavailable).toBe(false);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).get("/api/exercises/invalid");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid exercise id" });
  });

  it("returns 404 when exercise not found", async () => {
    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const res = await request(app).get("/api/exercises/999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Exercise not found" });
  });
});
