import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { uploadFileToGCS } from '../config/gcs';
import { processOrdersFile } from './orders.service';
import { findOrderById, findOrdersByCustomerId } from './orders.repository';

export async function uploadOrders(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const batchId = uuidv4();
  const localPath = req.file.path;
  const destinationName = `orders/${batchId}-${req.file.originalname}`;

  try {
    console.log(`[upload] start batch=${batchId} file=${req.file.originalname}`);
    const gcsPath = await uploadFileToGCS(localPath, destinationName);
    console.log(`[upload] complete batch=${batchId} gcsPath=${gcsPath}`);

    console.log(`[process] start batch=${batchId}`);
    const result = await processOrdersFile(localPath, batchId);
    console.log(`[process] complete batch=${batchId}`, result);

    fs.unlinkSync(localPath);

    return res.status(200).json({
      status: 'processed',
      batchId,
      gcsPath,
      ...result,
    });
  } catch (err) {
    console.error(`[upload] failed batch=${batchId}`, err);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    return res.status(500).json({ error: 'Upload or processing failed' });
  }
}

export async function getOrderById(req: Request, res: Response) {
  const orderId = req.params.order_id;

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
  const { customerId } = req.query;

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customerId query param is required' });
  }

  const orders = await findOrdersByCustomerId(customerId);
  return res.status(200).json({ customerId, count: orders.length, orders });
}

export default getOrderById;