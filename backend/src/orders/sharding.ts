import crypto from 'crypto';
import { getShardCount } from '../config/db';

export function getShardId(customerId: string): number {
  const shardCount = getShardCount();
  const hash = crypto.createHash('md5').update(customerId).digest('hex');
  const hashInt = parseInt(hash.slice(0, 8), 16);
  return hashInt % shardCount;
}