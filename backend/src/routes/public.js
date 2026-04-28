const express = require('express');
const supabase = require('../config/database');

const router = express.Router();

// Simple in-memory cache: key -> { data, expiresAt }
const cache = {};
function getCache(key) {
  const entry = cache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  delete cache[key];
  return null;
}
function setCache(key, data, ttlMs = 5000) {
  cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

// GET /api/public/paredao - Get current paredão (no auth)
router.get('/paredao', async (req, res) => {
  try {
    const cached = getCache('paredao');
    if (cached) return res.json(cached);
    const { data: stateRows } = await supabase
      .from('game_state')
      .select('key, value')
      .in('key', ['paredao_users', 'current_week', 'public_voting_active']);

    const state = {};
    (stateRows || []).forEach(row => {
      try { state[row.key] = JSON.parse(row.value); } catch { state[row.key] = row.value; }
    });

    const paredaoIds = Array.isArray(state.paredao_users) ? state.paredao_users : [];
    const week = parseInt(state.current_week) || 1;
    const isOpen = state.public_voting_active === true || state.public_voting_active === 'true';

    if (!isOpen) {
      const payload = { open: false, week, participants: [] };
      setCache('paredao', payload);
      return res.json(payload);
    }

    if (paredaoIds.length === 0) {
      return res.json({ open: true, week, participants: [] });
    }

    const { data: participants } = await supabase
      .from('users')
      .select('id, name, photo_url')
      .in('id', paredaoIds)
      .eq('is_eliminated', false);

    // Get vote counts for display
    const { data: votes } = await supabase
      .from('public_votes')
      .select('voted_for_id')
      .eq('week_number', week);

    const counts = {};
    paredaoIds.forEach(id => { counts[id] = 0; });
    (votes || []).forEach(v => {
      if (counts[v.voted_for_id] !== undefined) counts[v.voted_for_id]++;
    });

    const totalVotes = (votes || []).length;

    const result = (participants || []).map(p => ({
      ...p,
      votes: counts[p.id] || 0,
      percentage: totalVotes > 0 ? Math.round(((counts[p.id] || 0) / totalVotes) * 100) : 0
    }));

    const payload = { open: true, week, participants: result, totalVotes };
    setCache('paredao', payload);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/public/vote - Cast a public vote
router.post('/vote', async (req, res) => {
  try {
    const { voted_for_id, voter_token } = req.body;
    const voter_ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    if (!voted_for_id || !voter_token) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Check if public voting is open
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'public_voting_active')
      .single();

    if (stateRow?.value !== 'true') {
      return res.status(403).json({ error: 'Votação pública não está aberta' });
    }

    // Get current week
    const { data: weekRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(weekRow?.value) || 1;

    // Check if this token already voted
    const { data: existing } = await supabase
      .from('public_votes')
      .select('id')
      .eq('week_number', week_number)
      .eq('voter_token', voter_token)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'already_voted' });
    }

    // Check participant is in paredão
    const { data: paredaoRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'paredao_users')
      .single();

    let paredaoIds = [];
    try { paredaoIds = JSON.parse(paredaoRow?.value); } catch {}

    if (!Array.isArray(paredaoIds) || !paredaoIds.includes(voted_for_id)) {
      return res.status(400).json({ error: 'Participante inválido' });
    }

    // Register vote
    const { error } = await supabase.from('public_votes').insert({
      week_number,
      voter_token,
      voted_for_id,
      voter_ip
    });

    if (error) return res.status(500).json({ error: 'Erro ao registrar voto' });

    // Invalidate caches so next read reflects the new vote
    delete cache['paredao'];
    delete cache['results'];

    // Get voted participant name
    const { data: participant } = await supabase
      .from('users')
      .select('name')
      .eq('id', voted_for_id)
      .single();

    return res.json({ success: true, voted_for: participant?.name });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/public/results - Get public vote results (admin uses this too)
router.get('/results', async (req, res) => {
  try {
    const cached = getCache('results');
    if (cached) return res.json(cached);
    const { data: weekRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(weekRow?.value) || 1;

    const { data: votes } = await supabase
      .from('public_votes')
      .select('voted_for_id, users!voted_for_id(name, photo_url)')
      .eq('week_number', week_number);

    const counts = {};
    (votes || []).forEach(v => {
      const id = v.voted_for_id;
      if (!counts[id]) counts[id] = { user: v.users, count: 0 };
      counts[id].count++;
    });

    const total = (votes || []).length;
    const results = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .map(r => ({ ...r, percentage: total > 0 ? Math.round((r.count / total) * 100) : 0 }));

    const payload = { results, total, week_number };
    setCache('results', payload);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
