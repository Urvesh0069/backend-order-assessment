import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../auth/auth.middleware';
import { uploadOrders, getOrderById, getOrdersByCustomer } from './orders.controller';

const UPLOAD_DIR = path.join(process.cwd(), 'tmp_uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx') cb(null, true);
    else cb(new Error('Only .csv or .xlsx files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.post('/upload-orders', requireAuth, upload.single('file'), uploadOrders);
router.get('/:orderId', requireAuth, getOrderById);
router.get('/', requireAuth, getOrdersByCustomer);

export default router;