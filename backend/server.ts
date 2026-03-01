import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import adminRoutes from "./routes/admin";
import exercisesRoutes from "./routes/exercises";
import adminAuthRoutes from "./routes/adminAuth";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// must be before routes
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

//  routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/exercises", exercisesRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}