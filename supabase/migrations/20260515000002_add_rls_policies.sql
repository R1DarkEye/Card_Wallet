-- Enable RLS on all tables
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policy for vaults table
-- Users can only access their own vault
CREATE POLICY "Users can access their own vault"
  ON vaults FOR ALL
  USING (user_id::text = auth.uid());

-- RLS Policies for card_metadata table
-- Users can only access cards in their vault
CREATE POLICY "Users can access their own cards"
  ON card_metadata FOR ALL
  USING (user_id::text = auth.uid());

-- RLS Policies for image_metadata table
-- Users can only access images for their own cards
CREATE POLICY "Users can access their own card images"
  ON image_metadata FOR ALL
  USING (
    card_id IN (
      SELECT id FROM card_metadata 
      WHERE user_id::text = auth.uid()
    )
  );
