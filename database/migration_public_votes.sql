CREATE TABLE IF NOT EXISTS public_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  voter_token VARCHAR(100) NOT NULL,
  voted_for_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  voter_ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_number, voter_token)
);

CREATE INDEX IF NOT EXISTS idx_public_votes_week ON public_votes(week_number);
