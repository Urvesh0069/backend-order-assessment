import { Pool } from 'pg';
import { getPoolByShardId } from '../config/db';

interface OrderRecord {
  order_id?: string;
  customer_id: string;
  order_date: string;
  order_amount: number;
  status: string;
}

export async function batchInsertOrders(
  shardId: number,
  records: OrderRecord[]
): Promise<void> {
  if (records.length === 0) return;

  const pool: Pool = getPoolByShardId(shardId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Build a multi-row INSERT: ($1,$2,$3,$4), ($5,$6,$7,$8), ...
    const values: any[] = [];
    const placeholders: string[] = [];

    records.forEach((r, i) => {
      const offset = i * 4;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
      );
      values.push(r.customer_id, r.order_date, r.order_amount, r.status);
    });

    const query = `
      INSERT INTO orders (customer_id, order_date, order_amount, status)
      VALUES ${placeholders.join(', ')}
    `;

    await client.query(query, values);
    await client.query('COMMIT');
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
  // We don't know which shard this order lives on just from the ID,
  // since we shard by customer_id, not order_id.
  // For the assessment scope, fan out across all shards and return the first match.
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