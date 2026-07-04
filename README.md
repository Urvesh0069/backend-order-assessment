# Orders Ingestion Service

A Node.js + PostgreSQL backend that ingests a large orders file (~10,000 records),
stores the raw file in **Google Cloud Storage** (via Application Default
Credentials), parses/validates it with **streaming**, and writes the rows into a
**horizontally sharded** PostgreSQL setup using **batch inserts inside
transactions**.

- **Tech stack:** Node.js (TypeScript, Express 5), PostgreSQL (`pg`), Google Cloud Storage, Zod, Winston
- **Sharding:** application-level, hash of `customer_id`
- **File formats:** CSV (streamed) and Excel `.xlsx`

---

## Quick start

Prerequisites: Node.js 20+ and PostgreSQL running (one database per shard).

```bash
# 1. Backend — configure env
cd backend
cp .env.example .env          # then edit shard credentials in .env
npm install

# 2. Create the schema on every shard (one command)
npm run migrate

# 3. Run the API  (http://localhost:4000, health check at /health)
npm run dev

# 4. Frontend — in a second terminal
cd ../frontend
cp .env.example .env 2>/dev/null || true   # defaults to http://localhost:4000
npm install
npm run dev                   # opens http://localhost:5173
```

Then open **http://localhost:5173**, sign up, and upload `backend/sample_orders_10k.csv`.

**Storage mode:** the default `.env` uses `STORAGE_DRIVER=local` — uploads are saved
to `backend/local_gcs/`, so **no GCP setup is needed to run**. To use a real bucket,
set `STORAGE_DRIVER=gcs` + `GCS_BUCKET_NAME`, then run
`gcloud auth application-default login` (details in §3).

---

## 1. Architecture

```
POST /orders/upload-orders (multipart file)
        │
        ▼
  multer  ──►  temp file on disk (tmp_uploads/)
        │
        ├─► 1. uploadFileToGCS()   → GCS bucket via ADC  (or ./local_gcs in dev)
        │
        └─► 2. processOrdersFile()
                 ├─ stream rows (CSV) / read sheet (xlsx)
                 ├─ validate each row (Zod)         → invalid rows → failed_rows table
                 ├─ route row to shard = hash(customer_id) % SHARD_COUNT
                 ├─ buffer per shard, flush at BATCH_SIZE (500)
                 └─ batch INSERT ... ON CONFLICT DO NOTHING inside a transaction
```

Source layout:

| Path | Responsibility |
|---|---|
| `src/app.ts` | Express bootstrap, `/health`, route mounting |
| `src/config/db.ts` | One `pg.Pool` per shard + shard routing helpers |
| `src/config/gcs.ts` | GCS upload via ADC, with local-dev fallback |
| `src/config/logger.ts` | Winston logger |
| `src/orders/sharding.ts` | `getShardId(customer_id)` — the shard key logic |
| `src/orders/orders.service.ts` | Streaming parse, validation, batching |
| `src/orders/orders.repository.ts` | Batch insert, failed-row insert, queries |
| `src/orders/orders.controller.ts` | HTTP handlers |
| `src/db/migrations/*.sql` | Schema |
| `src/db/migrate.ts` | Runs all migrations across all shards |

---

## 2. Setup & Run

### Prerequisites
- Node.js 20+
- One or more PostgreSQL instances (one per shard)

### Install
```bash
cd backend
npm install
cp .env.example .env      # then edit values
```

### Configure `.env`
Set one block per shard (`SHARD0_*`, `SHARD1_*`, …) and `SHARD_COUNT`.
See `.env.example`. The `users` table lives on shard 0.

### Create the schema (one command, all shards)
```bash
npm run migrate
```

### Run
```bash
npm run dev      # ts-node-dev, hot reload
# or
npm run build && npm start
```
Health check: `GET http://localhost:4000/health`

---

## 3. Google ADC configuration

The service authenticates to GCS with **Application Default Credentials** — no
key files are stored in the repo (`new Storage()` resolves ADC automatically).

**Local development:**
```bash
gcloud auth application-default login
export STORAGE_DRIVER=gcs
export GCS_BUCKET_NAME=your-real-bucket
```

**Deployed (GKE / Cloud Run / GCE):** attach a service account via Workload
Identity — ADC picks it up from the metadata server. Nothing to configure in code.

**Local without any GCP setup (default):** leave `STORAGE_DRIVER=local`. Uploads
are copied to `./local_gcs/` so the whole pipeline is runnable offline. If
`STORAGE_DRIVER=gcs` is set but credentials are missing, the code logs the reason
and falls back to local rather than failing the request.

> No service-account JSON keys are committed. `.env` and key files are gitignored.

---

## 4. Sharding strategy

**Approach:** application-level sharding across multiple PostgreSQL databases.

**Shard key:** `customer_id`.

**Routing** (`src/orders/sharding.ts`):
```ts
shardId = parseInt(md5(customer_id)[0..8], 16) % SHARD_COUNT
```

**Why `customer_id`?**
- All of a customer's orders live on **one shard**, so `GET /orders?customerId=`
  is a single-shard query (no scatter-gather).
- MD5 hashing distributes customers **evenly** across shards regardless of ID format.
- Inserts for a batch naturally fan out across shards → parallel write throughput.

**Trade-offs**
- `GET /orders/:orderId` doesn't know the shard from the id alone, so it **fans
  out** across shards (acceptable for the assessment; a global id→shard lookup or
  encoding the shard into the id would remove this).
- Re-sharding (changing `SHARD_COUNT`) reshuffles the hash space and would require
  a migration — consistent hashing would reduce data movement.

---

## 5. Database schema

`orders` (per shard):

| Column | Type | Notes |
|---|---|---|
| `order_id` | `UUID PK` | from file if provided, else generated |
| `customer_id` | `VARCHAR(255)` | shard key, indexed |
| `order_date` | `TIMESTAMPTZ` | indexed |
| `order_amount` | `DECIMAL(12,2)` | |
| `status` | `VARCHAR(50)` | indexed |
| `created_at` | `TIMESTAMPTZ` | |

`failed_rows` stores rows that failed validation or insert (raw JSON + reason).
`users` (shard 0) backs the optional auth layer.

Indexes on `customer_id`, `order_date`, `status` support the query patterns and
high-volume inserts.

---

## 6. API

All `/orders` routes require `Authorization: Bearer <token>` (get a token from `/auth`).

| Method | Route | Description |
|---|---|---|
| `POST` | `/orders/upload-orders` | Upload CSV/xlsx → GCS + parse + shard-insert. Field name: `file`. |
| `GET` | `/orders/:orderId` | Fetch one order (fans out across shards) |
| `GET` | `/orders?customerId=X` | Orders for a customer (single shard) |
| `GET` | `/orders` | Full order list (merged across shards, `?limit=`) |
| `POST` | `/auth/signup` · `/auth/login` | Returns `{ user, token }` |
| `GET` | `/health` | Liveness + shard count |

Upload response:
```json
{ "status": "processed", "batchId": "...", "gcsPath": "gs://.../...",
  "totalRows": 10000, "inserted": 10000, "failed": 0 }
```

### Quick test
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"secret123"}' | jq -r .token)

curl -X POST http://localhost:4000/orders/upload-orders \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@backend/sample_orders_10k.csv"

curl "http://localhost:4000/orders?customerId=cust_1000" -H "Authorization: Bearer $TOKEN"
```
Sample files: `backend/sample_orders_10k.csv` (10k rows), `backend/example_orders.csv`.

---

## 7. Performance & scalability

- **Streaming:** CSV is read via `fs.createReadStream().pipe(csv-parser)` and
  consumed with `for await` — the whole file is never held in memory.
- **Batch inserts:** rows are buffered per shard and inserted 500 at a time as a
  single multi-row `INSERT` — never row-by-row.
- **Transactions:** each batch commits atomically; a failed batch rolls back and
  its rows are preserved in `failed_rows`.
- **Back-pressure:** processing `await`s each flush, so we don't queue unbounded
  work while the DB catches up.

> Excel `.xlsx` is a binary workbook and is read as a unit (SheetJS) — a
> documented trade-off. CSV is the recommended format for the 10k-record path.

---

## 8. Error handling & logging

- **Errors handled:** file upload failures, per-row validation errors, and batch
  insert failures — none of them crash the request.
- **Invalid rows** are logged and written to `failed_rows` (never silently dropped).
- **Logging** (Winston, `src/config/logger.ts`): upload start/end, per-batch insert
  counts, processing summary, and each failed row. `LOG_LEVEL` and `NODE_ENV`
  (pretty vs JSON) are configurable.
- **Idempotency:** `INSERT ... ON CONFLICT (order_id) DO NOTHING` — re-uploading a
  file whose rows carry `order_id` will not create duplicates.

---

## 9. Design decisions & trade-offs

- **Multiple databases over table partitioning** — models true horizontal scale
  (separate hosts) rather than a single-instance optimization.
- **Hash of `customer_id`** — optimizes the common per-customer read; costs a
  fan-out for by-id reads (documented above).
- **Local storage fallback** — lets the whole flow run without GCP credentials for
  review/dev; production uses real GCS via ADC by setting `STORAGE_DRIVER=gcs`.
- **Optional auth** — a small JWT layer guards the endpoints; not required by the
  spec but included for completeness.

### Possible next steps (bonus areas)
- Background processing (queue + worker) so uploads return `202` immediately.
- Dockerized multi-shard setup (`docker-compose`).
- Unit/integration tests around sharding + validation.

---

## 10. Deliverables map

| Requirement | Where |
|---|---|
| Source code | this repo |
| README (setup, ADC, sharding, trade-offs) | this file |
| SQL / migrations | `backend/src/db/migrations/`, `npm run migrate` |
| `.env.example` | `backend/.env.example` |
