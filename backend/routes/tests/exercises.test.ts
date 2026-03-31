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
  it("returns 200 with exercises list", async () => {
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

    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(mockChain),
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(
      "https://signed-url.com/video.mp4"
    );

    const res = await request(app).get("/api/exercises");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Pelvic Tilt");
    expect(res.body.data[0].video_url).toBe("https://signed-url.com/video.mp4");
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
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

    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(mockChain),
    });

    (createSignedUrl as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/exercises?search=pelvic");

    expect(res.status).toBe(200);
    expect(supabaseServer.from).toHaveBeenCalledWith("exercise");
    expect(mockChain.or).toHaveBeenCalled();
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

describe("GET /api/exercises/:id", () => {
  it("returns 200 with single exercise", async () => {
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

    (createSignedUrl as jest.Mock).mockResolvedValue(
      "https://signed-url.com/video.mp4"
    );

    const res = await request(app).get("/api/exercises/1");

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Pelvic Tilt");
    expect(res.body.video_url).toBe("https://signed-url.com/video.mp4");
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