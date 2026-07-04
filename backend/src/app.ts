import express from 'express';
import cors from 'cors';
import { verifyShardConnections, getShardCount } from './config/db';
import { logger } from './config/logger';
import authRoutes from './auth/auth.routes';
import ordersRoutes from './orders/orders.routes';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', shards: getShardCount(), uptime: process.uptime() })
);
app.use('/auth', authRoutes);
app.use('/orders', ordersRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  await verifyShardConnections();
  app.listen(PORT, () => logger.info(`Server running on ${PORT}`));
}

start().catch((err) => {
  logger.error('Failed to start server', { error: (err as Error).message });
  process.exit(1);
});