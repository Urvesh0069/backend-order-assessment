import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { uploadFileToGCS } from '../config/gcs';
import { processOrdersFile } from './orders.service';
import { logger } from '../config/logger';
import {
  findOrderById,
  findOrdersByCustomerId,
  findAllOrders,
} from './orders.repository';

export async function uploadOrders(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const batchId = uuidv4();
  const localPath = req.file.path;
  const destinationName = `orders/${batchId}-${req.file.originalname}`;

  try {
    logger.info('upload start', { batchId, file: req.file.originalname, size: req.file.size });

    const gcsPath = await uploadFileToGCS(localPath, destinationName);
    logger.info('upload to storage complete', { batchId, gcsPath });

    const result = await processOrdersFile(localPath, batchId);

    fs.unlinkSync(localPath);

    return res.status(200).json({
      status: 'processed',
      batchId,
      gcsPath,
      ...result,
    });
  } catch (err) {
    logger.error('upload failed', { batchId, error: (err as Error).message });
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    return res.status(500).json({ error: 'Upload or processing failed' });
  }
}

export async function getOrderById(req: Request, res: Response) {
  const orderId = req.params.orderId;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'orderId param is required' });
  }
  const order = await findOrderById(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.status(200).json(order);
}

export async function getOrdersByCustomer(req: Request, res: Response) {
  const { customerId, limit } = req.query;

  if (customerId) {
    if (typeof customerId !== 'string') {
      return res.status(400).json({ error: 'customerId must be a string' });
    }
    const orders = await findOrdersByCustomerId(customerId);
    return res.status(200).json({ customerId, count: orders.length, orders });
  }

  const parsedLimit = Math.min(parseInt(String(limit ?? '100'), 10) || 100, 1000);
  const orders = await findAllOrders(parsedLimit);
  return res.status(200).json({ count: orders.length, limit: parsedLimit, orders });
}

export default getOrderById;