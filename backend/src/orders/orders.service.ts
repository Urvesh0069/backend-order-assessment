import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { orderRowSchema } from './orders.validation';
import { getShardId } from './sharding';
import { batchInsertOrders, insertFailedRow } from './orders.repository';
import { logger } from '../config/logger';

const BATCH_SIZE = 500;

interface ProcessResult {
  totalRows: number;
  inserted: number;
  failed: number;
}

interface OrderRecord {
  order_id: string;
  customer_id: string;
  order_date: string;
  order_amount: number;
  status: string;
}

async function* readCsvRows(filePath: string): AsyncGenerator<Record<string, unknown>> {
  const stream = fs.createReadStream(filePath).pipe(csvParser());
  for await (const row of stream) {
    yield row as Record<string, unknown>;
  }
}

function* readXlsxRows(filePath: string): Generator<Record<string, unknown>> {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return;
  const sheet = workbook.Sheets[firstSheet]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  for (const row of rows) yield row;
}

function getRowReader(
  filePath: string
): AsyncGenerator<Record<string, unknown>> | Generator<Record<string, unknown>> {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.xlsx' ? readXlsxRows(filePath) : readCsvRows(filePath);
}

export async function processOrdersFile(
  filePath: string,
  batchId: string
): Promise<ProcessResult> {
  const shardBuffers: Map<number, OrderRecord[]> = new Map();
  let totalRows = 0;
  let inserted = 0;
  let failed = 0;

  const flushShard = async (shardId: number) => {
    const buffer = shardBuffers.get(shardId);
    if (!buffer || buffer.length === 0) return;

    const toInsert = buffer.splice(0, buffer.length);
    try {
      const affected = await batchInsertOrders(shardId, toInsert);
      inserted += affected;
      logger.info('batch inserted', {
        batchId,
        shardId,
        attempted: toInsert.length,
        inserted: affected,
      });
    } catch (err) {
      failed += toInsert.length;
      logger.error('batch insert failed', {
        batchId,
        shardId,
        count: toInsert.length,
        error: (err as Error).message,
      });
      for (const rec of toInsert) {
        await insertFailedRow(0, batchId, rec, `batch insert failed: ${(err as Error).message}`)
          .catch((e) => logger.error('failed to record failed row', { error: e.message }));
      }
    }
  };

  const handleRow = async (row: Record<string, unknown>) => {
    totalRows++;
    const parsed = orderRowSchema.safeParse(row);

    if (!parsed.success) {
      failed++;
      logger.warn('row validation failed', {
        batchId,
        error: parsed.error.flatten(),
      });
      await insertFailedRow(0, batchId, row, JSON.stringify(parsed.error.flatten())).catch(
        (e) => logger.error('failed to record failed row', { error: e.message })
      );
      return;
    }

    const { order_id, customer_id, order_date, order_amount, status } = parsed.data;
    const shardId = getShardId(customer_id);

    let buffer = shardBuffers.get(shardId);
    if (!buffer) {
      buffer = [];
      shardBuffers.set(shardId, buffer);
    }

    buffer.push({
      order_id: order_id ?? uuidv4(),
      customer_id,
      order_date,
      order_amount: parseFloat(order_amount),
      status,
    });

    if (buffer.length >= BATCH_SIZE) {
      await flushShard(shardId);
    }
  };

  const reader = getRowReader(filePath);
  for await (const row of reader) {
    await handleRow(row);
  }

  for (const shardId of shardBuffers.keys()) {
    await flushShard(shardId);
  }

  logger.info('processing complete', { batchId, totalRows, inserted, failed });
  return { totalRows, inserted, failed };
}
