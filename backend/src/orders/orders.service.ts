import fs from 'fs';
import csvParser from 'csv-parser';
import { orderRowSchema } from './orders.validation';
import { getShardId } from './sharding';
import { batchInsertOrders, insertFailedRow } from './orders.repository';

const BATCH_SIZE = 500;

interface ProcessResult {
  totalRows: number;
  inserted: number;
  failed: number;
}

export async function processOrdersFile(
  filePath: string,
  batchId: string
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    // Buffers keyed by shardId, so each shard gets its own batch queue
    const shardBuffers: Map<number, any[]> = new Map();

    let totalRows = 0;
    let inserted = 0;
    let failed = 0;
    const pendingFlushes: Promise<void>[] = [];

    const flushShard = async (shardId: number) => {
      const buffer = shardBuffers.get(shardId);
      if (!buffer || buffer.length === 0) return;

      const toInsert = buffer.splice(0, buffer.length);
      try {
        await batchInsertOrders(shardId, toInsert);
        inserted += toInsert.length;
      } catch (err) {
        console.error(`[process] batch insert failed for shard ${shardId}`, err);
        failed += toInsert.length;
      }
    };

    const stream = fs.createReadStream(filePath).pipe(csvParser());

    stream.on('data', (row) => {
      totalRows++;

      const parsed = orderRowSchema.safeParse(row);

      if (!parsed.success) {
        failed++;
        pendingFlushes.push(
          insertFailedRow(0, batchId, row, JSON.stringify(parsed.error.flatten()))
        );
        return;
      }

      const { customer_id, order_date, order_amount, status } = parsed.data;
      const shardId = getShardId(customer_id);

      if (!shardBuffers.has(shardId)) {
        shardBuffers.set(shardId, []);
      }

      const buffer = shardBuffers.get(shardId)!;
      buffer.push({
        customer_id,
        order_date,
        order_amount: parseFloat(order_amount),
        status,
      });

      if (buffer.length >= BATCH_SIZE) {
        pendingFlushes.push(flushShard(shardId));
      }
    });

    stream.on('end', async () => {
      try {
        // Wait for in-flight batch flushes triggered during streaming
        await Promise.all(pendingFlushes);

        // Flush any remaining partial batches per shard
        for (const shardId of shardBuffers.keys()) {
          await flushShard(shardId);
        }

        resolve({ totalRows, inserted, failed });
      } catch (err) {
        reject(err);
      }
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}