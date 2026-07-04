CREATE TABLE IF NOT EXISTS failed_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_batch_id UUID NOT NULL,
  raw_row JSONB NOT NULL,
  error_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);