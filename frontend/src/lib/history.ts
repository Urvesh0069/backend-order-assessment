import type { UploadResult } from '../api/types';

export interface UploadHistoryEntry extends UploadResult {
  fileName: string;
  at: number;
}

const KEY = 'orders_upload_history';
const MAX = 12;

export function getUploadHistory(): UploadHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UploadHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addUploadHistory(entry: UploadHistoryEntry) {
  const list = [entry, ...getUploadHistory()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearUploadHistory() {
  localStorage.removeItem(KEY);
}
