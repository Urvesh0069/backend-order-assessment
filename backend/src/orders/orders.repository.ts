import { Pool } from 'pg';
import { getPoolByShardId } from '../config/db';

interface OrderRecord {
  order_id: string;
  customer_id: string;
  order_date: string;
  order_amount: number;
  status: string;
}

export async function batchInsertOrders(
  shardId: number,
  records: OrderRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const pool: Pool = getPoolByShardId(shardId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const values: any[] = [];
    const placeholders: string[] = [];

    records.forEach((r, i) => {
      const offset = i * 5;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
      );
      values.push(r.order_id, r.customer_id, r.order_date, r.order_amount, r.status);
    });

    const query = `
      INSERT INTO orders (order_id, customer_id, order_date, order_amount, status)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (order_id) DO NOTHING
    `;

    const result = await client.query(query, values);
    await client.query('COMMIT');
    return result.rowCount ?? 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function insertFailedRow(
  shardId: number,
  batchId: string,
  rawRow: object,
  errorReason: string
): Promise<void> {
  const pool = getPoolByShardId(shardId);
  await pool.query(
    `INSERT INTO failed_rows (upload_batch_id, raw_row, error_reason) VALUES ($1, $2, $3)`,
    [batchId, JSON.stringify(rawRow), errorReason]
  );
}

export async function findOrderById(orderId: string) {
  const { getShardCount, getPoolByShardId } = await import('../config/db');
  const shardCount = getShardCount();

  for (let i = 0; i < shardCount; i++) {
    const pool = getPoolByShardId(i);
    const result = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }
  return null;
}

export async function findAllOrders(limit: number = 100) {
  const { getShardCount, getPoolByShardId } = await import('../config/db');
  const shardCount = getShardCount();

  const perShard = await Promise.all(
    Array.from({ length: shardCount }, (_, i) =>
      getPoolByShardId(i).query(
        'SELECT * FROM orders ORDER BY order_date DESC LIMIT $1',
        [limit]
      )
    )
  );

  const merged = perShard.flatMap((r) => r.rows);
  merged.sort(
    (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
  );
  return merged.slice(0, limit);
}

export async function findOrdersByCustomerId(customerId: string) {
  const { getShardId } = await import('./sharding');
  const { getPoolByShardId } = await import('../config/db');

  const shardId = getShardId(customerId);
  const pool = getPoolByShardId(shardId);

  const result = await pool.query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_date DESC',
    [customerId]
  );
  return result.rows;
}
