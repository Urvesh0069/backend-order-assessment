import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUsersPool } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET as string;
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const pool = getUsersPool();
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser(email: string, password: string): Promise<User> {
  const pool = getUsersPool();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email, passwordHash]
  );

  if (!result.rows[0]) {
    throw new Error('Failed to create user');
  }

  return result.rows[0];
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}