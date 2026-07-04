import type { ReactNode } from 'react';
import { CheckIcon } from './Icons';
import '../pages/Auth.css';

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          OrderOps
        </div>

        <div className="auth-hero">
          <h1>Ingest, shard &amp; track orders — all in one console.</h1>
          <p>
            Bulk-upload CSV or Excel order files, route them across database shards,
            and look up any order or customer in seconds.
          </p>
          <div className="auth-points">
            <div className="auth-point"><span className="tick"><CheckIcon width={14} height={14} /></span> Drag-and-drop bulk order uploads</div>
            <div className="auth-point"><span className="tick"><CheckIcon width={14} height={14} /></span> Real-time ingest stats &amp; validation</div>
            <div className="auth-point"><span className="tick"><CheckIcon width={14} height={14} /></span> Instant order &amp; customer lookup</div>
          </div>
        </div>

        <div className="auth-foot">© {new Date().getFullYear()} OrderOps · Secure JWT authentication</div>
      </aside>

      <div className="auth-form-panel">
        <div className="auth-card card card-pad fade-up">{children}</div>
      </div>
    </div>
  );
}
