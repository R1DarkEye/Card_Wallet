-- User vaults
CREATE TABLE vaults (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card metadata
CREATE TABLE card_metadata (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES vaults(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  blob_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  device_id TEXT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE
);

-- Image metadata
CREATE TABLE image_metadata (
  id UUID PRIMARY KEY,
  card_id UUID REFERENCES card_metadata(id) ON DELETE CASCADE,
  side TEXT NOT NULL, -- 'front' or 'back'
  blob_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted BOOLEAN DEFAULT FALSE
);

-- RLS Policies
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own vault"
  ON vaults FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own card metadata"
  ON card_metadata FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own image metadata"
  ON image_metadata FOR ALL
  USING (
    card_id IN (
      SELECT id FROM card_metadata WHERE user_id = auth.uid()
    )
  );

-- Storage Buckets
-- Note: Bucket creation usually happens via Supabase Dashboard or API, but policy can be defined here.
-- Assuming a bucket named 'vaults' exists.

-- Storage Policies
-- Users can only read/write their own vault folder
-- Note: This depends on the storage implementation, but standard Supabase policy looks like this:
-- CREATE POLICY "User vault access"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'vaults' AND auth.uid()::text = (storage.foldername(name))[1]);
