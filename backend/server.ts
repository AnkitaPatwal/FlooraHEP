import 'dotenv/config';
import express from 'express';
import adminRoutes from './routes/admin';
import exercisesRoutes from './routes/exercises';
import adminAuthRoutes from './routes/adminAuth';
import cors from "cors";

import cors from "cors";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));


app.use(cors({
  origin: 'http://localhost:5173/',
  credentials: true,
}));

app.use(express.json());

app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exercises', exercisesRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

