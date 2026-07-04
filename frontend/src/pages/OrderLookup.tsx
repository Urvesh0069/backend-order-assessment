import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getAllOrders, getOrderById, toErrorMessage } from '../api/client';
import type { Order } from '../api/types';
import { money, orderDate } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { SearchIcon, AlertIcon } from '../components/Icons';
import './Pages.css';

const LIMIT_OPTIONS = [50, 100, 250, 500];

export default function OrderLookup() {
  const [orderId, setOrderId] = useState('');
  const [found, setFound] = useState<Order | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [limit, setLimit] = useState(100);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const loadList = useCallback(async (lim: number) => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await getAllOrders(lim);
      setOrders(data.orders);
    } catch (err) {
      setListError(toErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList(limit);
  }, [limit, loadList]);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return;
    setSearching(true);
    setSearchError('');
    setFound(null);
    setSearched(true);
    try {
      const data = await getOrderById(id);
      setFound(data);
    } catch (err) {
      setSearchError(toErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const openOrder = (o: Order) => {
    setOrderId(o.order_id);
    setFound(o);
    setSearched(true);
    setSearchError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFound = () => {
    setFound(null);
    setSearched(false);
    setSearchError('');
    setOrderId('');
  };

  return (
    <div className="fade-up">
      <div className="page-head">
        <h1 className="page-title">Orders</h1>
        <p className="page-desc">Browse all orders across every shard, or look up a single order by its UUID.</p>
      </div>

      <form className="lookup-bar" onSubmit={search} style={{ marginBottom: 18 }}>
        <input
          className="input"
          placeholder="Find by Order ID — e.g. 3f2504e0-4f89-41d3-9a0c-0305e82c3301"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <button className="btn btn-primary" disabled={searching || !orderId.trim()}>
          {searching ? <><span className="spinner" /> Searching…</> : <><SearchIcon width={18} height={18} /> Find</>}
        </button>
      </form>

      {searchError && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <AlertIcon width={18} height={18} /> <span>{searchError}</span>
        </div>
      )}

      {searched && !searching && !found && !searchError && (
        <div className="empty" style={{ marginBottom: 18 }}>
          <div className="emoji">🔍</div>
          <p style={{ marginTop: 8 }}>No order found for that ID.</p>
        </div>
      )}

      {found && (
        <div className="card card-pad stack stack-16 fade-up" style={{ marginBottom: 26 }}>
          <div className="row between">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Order details</h2>
            <div className="row gap-12">
              <StatusBadge status={String(found.status)} />
              <button className="btn btn-ghost" onClick={clearFound}>Clear</button>
            </div>
          </div>
          <div className="kv-grid">
            <div className="kv">
              <div className="kv-label">Order ID</div>
              <div className="kv-value mono" style={{ fontSize: 13.5 }}>{found.order_id}</div>
            </div>
            <div className="kv">
              <div className="kv-label">Customer ID</div>
              <div className="kv-value">{found.customer_id}</div>
            </div>
            <div className="kv">
              <div className="kv-label">Order date</div>
              <div className="kv-value">{orderDate(String(found.order_date))}</div>
            </div>
            <div className="kv">
              <div className="kv-label">Amount</div>
              <div className="kv-value">{money(found.order_amount)}</div>
            </div>
            <div className="kv">
              <div className="kv-label">Status</div>
              <div className="kv-value" style={{ textTransform: 'capitalize' }}>{String(found.status)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 14, alignItems: 'flex-end' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          All orders {!loadingList && <span className="faint" style={{ fontWeight: 500 }}>· {orders.length}</span>}
        </h2>
        <div className="row gap-12">
          <label className="text-sm muted">Show
            <select
              className="input"
              style={{ width: 'auto', display: 'inline-block', marginLeft: 8, padding: '6px 10px' }}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost" onClick={() => loadList(limit)} disabled={loadingList}>
            {loadingList ? <><span className="spinner" /> Loading…</> : 'Refresh'}
          </button>
        </div>
      </div>

      {listError && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <AlertIcon width={18} height={18} /> <span>{listError}</span>
        </div>
      )}

      <div className="card table-wrap">
        {loadingList ? (
          <div className="empty"><span className="spinner" /> <p style={{ marginTop: 8 }}>Loading orders…</p></div>
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="emoji">📭</div>
            <p style={{ marginTop: 8 }}>No orders yet. Upload a file to get started.</p>
          </div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id} onClick={() => openOrder(o)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ fontSize: 12.5 }}>{o.order_id}</td>
                  <td>{o.customer_id}</td>
                  <td>{orderDate(String(o.order_date))}</td>
                  <td style={{ fontWeight: 600 }}>{money(o.order_amount)}</td>
                  <td><StatusBadge status={String(o.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
