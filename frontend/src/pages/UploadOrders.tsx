import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { uploadOrders, toErrorMessage } from '../api/client';
import type { UploadResult } from '../api/types';
import { addUploadHistory } from '../lib/history';
import { UploadIcon, FileIcon, CheckIcon, AlertIcon, CopyIcon } from '../components/Icons';
import './Pages.css';

const ACCEPT = ['.csv', '.xlsx'];

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadOrders() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const pickFile = (f: File | null) => {
    setError('');
    setResult(null);
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.includes(ext)) {
      setError('Only .csv or .xlsx files are allowed.');
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(0);
    setResult(null);
    try {
      const res = await uploadOrders(file, setProgress);
      setResult(res);
      addUploadHistory({ ...res, fileName: file.name, at: Date.now() });
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const copyBatch = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const successRate = result && result.totalRows > 0
    ? Math.round((result.inserted / result.totalRows) * 100)
    : 0;

  return (
    <div className="fade-up" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1 className="page-title">Upload Orders</h1>
        <p className="page-desc">Import a CSV or Excel file. Each row is validated, sharded by customer, and written to the database.</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <AlertIcon width={18} height={18} /> <span>{error}</span>
        </div>
      )}

      {!result && (
        <div className="stack stack-16">
          {!file ? (
            <div
              className={`dropzone ${dragging ? 'drag' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="dz-ico"><UploadIcon width={26} height={26} /></div>
              <h3>Drop your file here, or click to browse</h3>
              <p>Maximum file size 50 MB</p>
              <div className="dz-formats">
                <span className="chip">.csv</span>
                <span className="chip">.xlsx</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="file-preview">
              <div className="fp-ico"><FileIcon width={22} height={22} /></div>
              <div style={{ flex: 1 }}>
                <div className="file-name">{file.name}</div>
                <div className="file-meta">{humanSize(file.size)}</div>
              </div>
              {!uploading && (
                <button className="btn btn-ghost" onClick={reset}>Remove</button>
              )}
            </div>
          )}

          {uploading && (
            <div className="stack gap-8">
              <div className="row between text-sm muted">
                <span>Uploading &amp; processing…</span>
                <span>{progress}%</span>
              </div>
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          {file && (
            <div className="row gap-12">
              <button className="btn btn-primary btn-lg" onClick={submit} disabled={uploading}>
                {uploading ? <><span className="spinner" /> Processing…</> : <><UploadIcon width={18} height={18} /> Upload &amp; process</>}
              </button>
              {!uploading && <button className="btn btn-ghost btn-lg" onClick={reset}>Cancel</button>}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="stack stack-20 fade-up">
          <div className="alert alert-success">
            <CheckIcon width={18} height={18} />
            <span>File processed successfully — {result.inserted.toLocaleString()} of {result.totalRows.toLocaleString()} rows inserted ({successRate}% success).</span>
          </div>

          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label" style={{ marginTop: 0 }}>Total rows</div>
              <div className="stat-value">{result.totalRows.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label" style={{ marginTop: 0 }}>Inserted</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{result.inserted.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label" style={{ marginTop: 0 }}>Failed</div>
              <div className="stat-value" style={{ color: result.failed > 0 ? 'var(--red)' : 'var(--text)' }}>{result.failed.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label" style={{ marginTop: 0 }}>Success rate</div>
              <div className="stat-value">{successRate}%</div>
            </div>
          </div>

          <div className="card card-pad stack gap-12">
            <div className="row between">
              <div>
                <div className="kv-label">Batch ID</div>
                <div className="mono" style={{ marginTop: 6 }}>{result.batchId}</div>
              </div>
              <button className="btn btn-ghost" onClick={copyBatch}>
                <CopyIcon width={16} height={16} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="kv-label">Storage path</div>
              <div className="mono faint" style={{ marginTop: 6, wordBreak: 'break-all' }}>{result.gcsPath}</div>
            </div>
          </div>

          <div className="row gap-12">
            <button className="btn btn-primary" onClick={reset}>
              <UploadIcon width={18} height={18} /> Upload another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
