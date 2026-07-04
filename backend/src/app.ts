import express from 'express';
import { verifyShardConnections } from './config/db';
import authRoutes from './auth/auth.routes';
import ordersRoutes from './orders/orders.routes';


const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/orders', ordersRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  await verifyShardConnections(); // fails fast if DB creds are wrong
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});