import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';


dotenv.config();

const SHARD_COUNT = parseInt(process.env.SHARD_COUNT || '1', 10);

function buildShardConfig(index: number): PoolConfig {
  const prefix = `SHARD${index}`;

  const host = process.env[`${prefix}_HOST`];
  const port = process.env[`${prefix}_PORT`];
  const user = process.env[`${prefix}_USER`];
  const password = process.env[`${prefix}_PASSWORD`];
  const database = process.env[`${prefix}_DATABASE`];

  if (!host || !port || !user || !password || !database) {
    throw new Error(
      `Missing env vars for ${prefix}. Expected ${prefix}_HOST, ${prefix}_PORT, ${prefix}_USER, ${prefix}_PASSWORD, ${prefix}_DATABASE`
    );
  }

  return {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const shardPools: Pool[] = [];

for (let i = 0; i < SHARD_COUNT; i++) {
  const config = buildShardConfig(i);
  const pool = new Pool(config);

  pool.on('error', (err) => {
    console.error(`Unexpected error on idle client for shard ${i}`, err);
  });

  shardPools.push(pool);
}

export function getShardCount(): number {
  return SHARD_COUNT;
}

export function getPoolByShardId(shardId: number): Pool {
  if (shardId < 0 || shardId >= shardPools.length) {
    throw new Error(`Invalid shard id: ${shardId}`);
  }
  return shardPools[shardId]!;
}

export function getUsersPool(): Pool {
  const pool = shardPools[0];
  if (!pool) {
    throw new Error('Users pool is not initialized');
  }
  return pool;
}

export async function verifyShardConnections(): Promise<void> {
  for (let i = 0; i < shardPools.length; i++) {
    try {
      const pool = shardPools[i];
      if (!pool) throw new Error(`Shard pool ${i} is undefined`);
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log(`✅ Shard ${i} connected`);
    } catch (err) {
      console.error(`❌ Shard ${i} connection failed:`, err);
      throw err;
    }
  }
}

export default shardPools;
