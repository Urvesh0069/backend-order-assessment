import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUploadHistory } from '../lib/history';
import { UploadIcon, SearchIcon, UsersIcon, FileIcon, CheckIcon, AlertIcon } from '../components/Icons';
import './Pages.css';

function fmt(n: number) {
  return n.toLocaleString();
}
function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ms).toLocaleDateString();
}

export default function Dashboard() {
  const { user } = useAuth();
  const history = useMemo(() => getUploadHistory(), []);

  const totals = useMemo(() => {
    return history.reduce(
      (acc, h) => {
        acc.batches += 1;
        acc.rows += h.totalRows;
        acc.inserted += h.inserted;
        acc.failed += h.failed;
        return acc;
      },
      { batches: 0, rows: 0, inserted: 0, failed: 0 }
    );
  }, [history]);

  return (
    <div className="fade-up">
      <div className="page-head">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-desc">Welcome back, {user?.email}. Here&apos;s your ingestion overview.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 30 }}>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label" style={{ marginTop: 0 }}>Upload batches</span>
            <div className="stat-ico blue"><FileIcon width={18} height={18} /></div>
          </div>
          <div className="stat-value">{fmt(totals.batches)}</div>
          <div className="stat-label">Total files processed</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label" style={{ marginTop: 0 }}>Rows scanned</span>
            <div className="stat-ico violet"><SearchIcon width={18} height={18} /></div>
          </div>
          <div className="stat-value">{fmt(totals.rows)}</div>
          <div className="stat-label">Across all uploads</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label" style={{ marginTop: 0 }}>Inserted</span>
            <div className="stat-ico green"><CheckIcon width={18} height={18} /></div>
          </div>
          <div className="stat-value">{fmt(totals.inserted)}</div>
          <div className="stat-label">Orders written to shards</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label" style={{ marginTop: 0 }}>Failed rows</span>
            <div className="stat-ico red"><AlertIcon width={18} height={18} /></div>
          </div>
          <div className="stat-value">{fmt(totals.failed)}</div>
          <div className="stat-label">Rejected on validation</div>
        </div>
      </div>

      <h2 className="section-title">Quick actions</h2>
      <div className="qa-grid" style={{ marginBottom: 34 }}>
        <Link to="/upload" className="qa-card">
          <div className="qa-ico"><UploadIcon /></div>
          <div className="qa-title">Upload orders</div>
          <div className="qa-desc">Bulk-import a CSV or Excel file. Rows are validated and sharded automatically.</div>
          <span className="qa-arrow">Start upload →</span>
        </Link>
        <Link to="/orders" className="qa-card">
          <div className="qa-ico"><SearchIcon /></div>
          <div className="qa-title">Find by Order ID</div>
          <div className="qa-desc">Look up a single order by its UUID across every database shard.</div>
          <span className="qa-arrow">Search orders →</span>
        </Link>
        <Link to="/customers" className="qa-card">
          <div className="qa-ico"><UsersIcon /></div>
          <div className="qa-title">Customer orders</div>
          <div className="qa-desc">Fetch the full order history for any customer ID, newest first.</div>
          <span className="qa-arrow">View customers →</span>
        </Link>
      </div>

      <h2 className="section-title">Recent uploads</h2>
      <div className="card">
        {history.length === 0 ? (
          <div className="empty">
            <div className="emoji">📥</div>
            <p style={{ marginTop: 8 }}>No uploads yet. <Link to="/upload">Upload your first order file →</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Batch ID</th>
                  <th>Total</th>
                  <th>Inserted</th>
                  <th>Failed</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.batchId}>
                    <td style={{ fontWeight: 600 }}>{h.fileName}</td>
                    <td className="mono faint">{h.batchId.slice(0, 8)}…</td>
                    <td>{fmt(h.totalRows)}</td>
                    <td><span className="badge badge-green">{fmt(h.inserted)}</span></td>
                    <td>{h.failed > 0 ? <span className="badge badge-red">{fmt(h.failed)}</span> : <span className="faint">0</span>}</td>
                    <td className="faint">{timeAgo(h.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
