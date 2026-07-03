import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth.service';

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const parts = authHeader.split(' ');
  const token = parts[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}