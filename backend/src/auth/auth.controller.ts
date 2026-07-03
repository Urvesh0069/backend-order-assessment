import { Request, Response } from 'express';
import { signupSchema, loginSchema } from './auth.validation';
import {
  findUserByEmail,
  createUser,
  verifyPassword,
  generateToken,
} from './auth.service';

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const user = await createUser(email, password);
  const token = generateToken(user.id);

  return res.status(201).json({
    user: { id: user.id, email: user.email },
    token,
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);

  return res.status(200).json({
    user: { id: user.id, email: user.email },
    token,
  });
}