import fs from 'fs';
import path from 'path';
import { getShardCount, getPoolByShardId } from '../config/db';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql migrations found in', MIGRATIONS_DIR);
    return;
  }

  const shardCount = getShardCount();
  console.log(`Applying ${files.length} migration(s) across ${shardCount} shard(s)`);

  for (let shardId = 0; shardId < shardCount; shardId++) {
    const pool = getPoolByShardId(shardId);
    const client = await pool.connect();

    try {
      console.log(`\n── Shard ${shardId} ──`);
      for (const file of files) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('COMMIT');
          console.log(`  ✅ ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`Migration ${file} failed on shard ${shardId}: ${(err as Error).message}`);
        }
      }
    } finally {
      client.release();
    }
  }

  console.log('\nAll migrations applied.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nMigration run failed:', err);
    process.exit(1);
  });
