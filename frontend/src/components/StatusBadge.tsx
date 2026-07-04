const MAP: Record<string, string> = {
  completed: 'badge-green',
  shipped: 'badge-blue',
  pending: 'badge-amber',
  processing: 'badge-violet',
  cancelled: 'badge-red',
  canceled: 'badge-red',
  refunded: 'badge-slate',
};

export default function StatusBadge({ status }: { status: string }) {
  const key = (status || '').toLowerCase().trim();
  const cls = MAP[key] || 'badge-slate';
  return <span className={`badge ${cls}`}>{status || 'unknown'}</span>;
}
