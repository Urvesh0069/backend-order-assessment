import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { getOrdersByCustomer, toErrorMessage } from '../api/client';
import type { Order } from '../api/types';
import { money, orderDate } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { UsersIcon, SearchIcon, AlertIcon } from '../components/Icons';
import './Pages.css';

export default function CustomerOrders() {
  const [customerId, setCustomerId] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [resolvedId, setResolvedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const id = customerId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setOrders(null);
    try {
      const data = await getOrdersByCustomer(id);
      setOrders(data.orders);
      setResolvedId(data.customerId);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!orders) return null;
    const total = orders.reduce((s, o) => {
      const n = typeof o.order_amount === 'string' ? parseFloat(o.order_amount) : o.order_amount;
      return s + (isNaN(n) ? 0 : n);
    }, 0);
    return { count: orders.length, total };
  }, [orders]);

  return (
    <div className="fade-up">
      <div className="page-head">
        <h1 className="page-title">Customer Orders</h1>
        <p className="page-desc">Look up the complete order history for a customer, newest first.</p>
      </div>

      <form className="lookup-bar" onSubmit={search} style={{ marginBottom: 22, maxWidth: 640 }}>
        <input
          className="input"
          placeholder="e.g. cust_1001"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" disabled={loading || !customerId.trim()}>
          {loading ? <><span className="spinner" /> Searching…</> : <><SearchIcon width={18} height={18} /> Search</>}
        </button>
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <AlertIcon width={18} height={18} /> <span>{error}</span>
        </div>
      )}

      {orders && summary && (
        <div className="stack stack-16 fade-up">
          <div className="summary-strip">
            <div>
              <div className="si-value">{resolvedId}</div>
              <div className="si-label">Customer ID</div>
            </div>
            <div>
              <div className="si-value">{summary.count}</div>
              <div className="si-label">Total orders</div>
            </div>
            <div>
              <div className="si-value">{money(summary.total)}</div>
              <div className="si-label">Lifetime value</div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="card empty">
              <div className="emoji">📭</div>
              <p style={{ marginTop: 8 }}>No orders found for <strong>{resolvedId}</strong>.</p>
            </div>
          ) : (
            <div className="card table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_id}>
                      <td className="mono" style={{ fontSize: 12.5 }}>{o.order_id}</td>
                      <td>{orderDate(String(o.order_date))}</td>
                      <td style={{ fontWeight: 600 }}>{money(o.order_amount)}</td>
                      <td><StatusBadge status={String(o.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!orders && !loading && !error && (
        <div className="empty">
          <div className="emoji"><UsersIcon width={34} height={34} /></div>
          <p style={{ marginTop: 8 }}>Enter a customer ID above to see their orders.</p>
        </div>
      )}
    </div>
  );
}
