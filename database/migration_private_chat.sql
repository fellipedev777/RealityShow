-- Private messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_sender
  ON private_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pm_receiver
  ON private_messages(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pm_unread
  ON private_messages(receiver_id, read_at)
  WHERE read_at IS NULL;
