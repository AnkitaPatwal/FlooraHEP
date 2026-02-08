import 'dotenv/config';
import express from 'express';
import adminRoutes from './routes/admin';
import exercisesRoutes from './routes/exercises';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/exercises', exercisesRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
