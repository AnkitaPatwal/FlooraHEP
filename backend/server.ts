import dotenv from "dotenv";
dotenv.config({ path: ".env" });

console.log("JWT_SECRET loaded:", Boolean(process.env.JWT_SECRET));

import 'dotenv/config';
import express from 'express';
import adminRoutes from './routes/admin';
import exercisesRoutes from './routes/exercises';
import adminAuthRoutes from './routes/adminAuth';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed =
        !origin ||
        origin === "http://localhost:5173" ||
        origin === "http://localhost:8081" ||
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
      cb(null, allowed);
    },
    credentials: true,
  })
);

app.use(express.json());

app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exercises', exercisesRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(PORT), () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}