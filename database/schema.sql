-- LiveReality - Complete Database Schema
-- Run this on Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  photo_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_eliminated BOOLEAN DEFAULT FALSE,
  eliminated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100),
  description TEXT,
  color VARCHAR(20) DEFAULT '#1a1a2e',
  icon VARCHAR(50),
  is_restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default rooms
INSERT INTO rooms (name, slug, description, color, icon, is_restricted) VALUES
  ('Sala Principal', 'sala-principal', 'Espaço de convivência de todos', '#1a1a2e', '🏠', FALSE),
  ('Quarto Líder', 'quarto-lider', 'Quarto exclusivo do Líder da semana', '#FFD700', '👑', TRUE),
  ('Quarto Azul', 'quarto-azul', 'Quarto azul da casa', '#1e3a5f', '💙', FALSE),
  ('Quarto Rosa', 'quarto-rosa', 'Quarto rosa da casa', '#5f1e3a', '🌸', FALSE),
  ('Quarto Verde', 'quarto-verde', 'Quarto verde da casa', '#1e5f2e', '💚', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ROOM PARTICIPANTS (who is in which room)
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- each participant is in only one room at a time
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(100),
  user_photo TEXT,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GAME EVENTS / SCHEDULE
CREATE TABLE IF NOT EXISTS game_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'prova_lider', 'prova_anjo', 'sincerao', 'votacao', 'bate_volta', 'eliminacao', 'convivencia'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  week_number INTEGER DEFAULT 1,
  day_of_week VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- PROVAS (Challenges)
CREATE TABLE IF NOT EXISTS provas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES game_events(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL, -- 'lider', 'anjo', 'bate_volta'
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'finished'
  current_question_index INTEGER DEFAULT 0,
  time_per_question INTEGER DEFAULT 30, -- seconds
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prova_id UUID REFERENCES provas(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  correct_answer CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PROVA ANSWERS
CREATE TABLE IF NOT EXISTS prova_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prova_id UUID REFERENCES provas(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  answer CHAR(1), -- 'A', 'B', 'C', 'D'
  is_correct BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prova_id, question_id, user_id)
);

-- PROVA SCORES
CREATE TABLE IF NOT EXISTS prova_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prova_id UUID REFERENCES provas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  answers_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prova_id, user_id)
);

-- GAME STATE (current week leader, angel, etc.)
CREATE TABLE IF NOT EXISTS game_state (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default game state
INSERT INTO game_state (key, value) VALUES
  ('current_week', '1'),
  ('current_day', '1'),
  ('current_leader_id', 'null'),
  ('current_angel_id', 'null'),
  ('immune_user_id', 'null'),
  ('paredao_users', '[]'),
  ('game_started', 'false'),
  ('game_started_at', 'null'),
  ('sincerao_active', 'false'),
  ('votacao_active', 'false')
ON CONFLICT (key) DO NOTHING;

-- VOTES
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  voter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  voted_for_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(30) DEFAULT 'paredao', -- 'paredao', 'indicacao_lider', 'anjo_imunidade'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_number, voter_id, vote_type)
);

-- PAREDAO
CREATE TABLE IF NOT EXISTS paredao (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  participants JSONB DEFAULT '[]', -- array of user_ids
  vote_counts JSONB DEFAULT '{}',  -- {user_id: count}
  eliminated_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bate_volta_winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'bate_volta', 'eliminated'
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  UNIQUE(week_number)
);

-- SINCERAO
CREATE TABLE IF NOT EXISTS sincerao_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  theme VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  UNIQUE(week_number)
);

CREATE TABLE IF NOT EXISTS sincerao_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sincerao_id UUID REFERENCES sincerao_events(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  author_name VARCHAR(100),
  target_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS / ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200),
  content TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info', -- 'info', 'warning', 'success', 'elimination'
  is_global BOOLEAN DEFAULT TRUE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_prova_answers_prova ON prova_answers(prova_id, user_id);
CREATE INDEX IF NOT EXISTS idx_votes_week ON votes(week_number, voter_id);
CREATE INDEX IF NOT EXISTS idx_sincerao_comments_sincerao ON sincerao_comments(sincerao_id);

-- DEFAULT QUESTIONS POOL (for provas)
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category VARCHAR(100) DEFAULT 'geral',
  question_text TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium'
);

-- Insert sample questions
INSERT INTO question_bank (category, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty) VALUES
('Brasil', 'Qual é a capital do Brasil?', 'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'C', 'easy'),
('Brasil', 'Qual é o maior estado do Brasil em área?', 'Mato Grosso', 'Pará', 'Amazonas', 'Minas Gerais', 'C', 'medium'),
('Cultura', 'Quem pintou a obra "O Grito"?', 'Van Gogh', 'Picasso', 'Edvard Munch', 'Salvador Dali', 'C', 'medium'),
('Ciência', 'Qual é o símbolo químico da água?', 'O2', 'H2O', 'CO2', 'NaCl', 'B', 'easy'),
('História', 'Em que ano o Brasil se tornou independente?', '1789', '1800', '1822', '1888', 'C', 'easy'),
('Matemática', 'Quanto é a raiz quadrada de 144?', '10', '11', '12', '13', 'C', 'easy'),
('Geografia', 'Qual é o rio mais longo do Brasil?', 'Rio São Francisco', 'Rio Paraná', 'Rio Amazonas', 'Rio Negro', 'C', 'easy'),
('Esporte', 'Quantas vezes o Brasil ganhou a Copa do Mundo?', '4', '5', '6', '3', 'B', 'easy'),
('Ciência', 'Qual planeta é o maior do sistema solar?', 'Saturno', 'Netuno', 'Júpiter', 'Urano', 'C', 'medium'),
('Literatura', 'Quem escreveu "Dom Casmurro"?', 'José de Alencar', 'Machado de Assis', 'Clarice Lispector', 'Carlos Drummond', 'B', 'medium'),
('História', 'Quem foi o primeiro presidente do Brasil?', 'Getúlio Vargas', 'Dom Pedro II', 'Deodoro da Fonseca', 'Floriano Peixoto', 'C', 'medium'),
('Cultura', 'Qual é o instrumento símbolo do samba?', 'Violão', 'Pandeiro', 'Flauta', 'Cavaquinho', 'B', 'medium'),
('Ciência', 'Qual é a velocidade da luz no vácuo?', '300.000 km/s', '150.000 km/s', '450.000 km/s', '200.000 km/s', 'A', 'medium'),
('Brasil', 'Qual é a maior cidade do Brasil?', 'Rio de Janeiro', 'Brasília', 'São Paulo', 'Salvador', 'C', 'easy'),
('Matemática', 'Quanto é Pi (aproximado)?', '3.14', '2.71', '1.41', '1.73', 'A', 'easy'),
('Cultura', 'Qual é a dança típica do Nordeste brasileiro?', 'Samba', 'Forró', 'Axé', 'Frevo', 'B', 'easy'),
('História', 'Em que ano terminou a Segunda Guerra Mundial?', '1943', '1944', '1945', '1946', 'C', 'easy'),
('Ciência', 'Qual é o elemento mais abundante na atmosfera terrestre?', 'Oxigênio', 'Hidrogênio', 'Dióxido de carbono', 'Nitrogênio', 'D', 'medium'),
('Geografia', 'Qual é o país mais populoso do mundo?', 'Índia', 'China', 'Estados Unidos', 'Brasil', 'A', 'medium'),
('Cultura Pop', 'Qual artista brasileiro ficou famoso mundialmente com "Ai Se Eu Te Pego"?', 'Gusttavo Lima', 'Michel Teló', 'Wesley Safadão', 'Luan Santana', 'B', 'easy');
