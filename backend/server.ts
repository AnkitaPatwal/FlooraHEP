import dotenv from "dotenv";
import path from "path";

// Load .env from backend directory (works when run from project root or backend/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config(); // fallback to cwd .env
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import adminRoutes from "./routes/admin";
import assignPackageRoutes from "./routes/assignPackage";
import exercisesRoutes from "./routes/exercises";
import adminAuthRoutes from "./routes/adminAuth";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed =
        !origin ||
        origin === "http://localhost:5173" ||
        origin === "http://localhost:5174" ||
        origin === "http://localhost:8081" ||
        origin === "https://floorahep-production-fec5.up.railway.app" ||  // ← frontend
        origin === "https://floorahep-production.up.railway.app" || // ← backend
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
      cb(null, allowed);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assign-package", assignPackageRoutes);
app.use("/api/exercises", exercisesRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

module.exports = app; // for testing

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
