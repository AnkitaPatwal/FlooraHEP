import 'dotenv/config';
import express from 'express';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
