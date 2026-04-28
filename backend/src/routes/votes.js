const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/votes/cast - Cast a vote
router.post('/cast', auth, async (req, res) => {
  try {
    const { voted_for_id, vote_type = 'paredao' } = req.body;

    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: votacaoState } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'votacao_active')
      .single();

    if (votacaoState?.value !== 'true' && vote_type === 'paredao') {
      return res.status(403).json({ error: 'Votação não está aberta' });
    }

    // Reject vote for immune or leader
    const { data: protectedRows } = await supabase
      .from('game_state').select('key, value').in('key', ['immune_user_id', 'current_leader_id']);
    const prot = {};
    (protectedRows || []).forEach(r => { try { prot[r.key] = JSON.parse(r.value); } catch { prot[r.key] = r.value; } });
    if (prot.immune_user_id && prot.immune_user_id === voted_for_id) {
      return res.status(400).json({ error: 'Este participante está imunizado' });
    }
    if (prot.current_leader_id && prot.current_leader_id === voted_for_id) {
      return res.status(400).json({ error: 'O Líder não pode ser votado' });
    }

    // Check if already voted
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('week_number', week_number)
      .eq('voter_id', req.user.id)
      .eq('vote_type', vote_type)
      .single();

    if (existing) return res.status(409).json({ error: 'Você já votou nesta semana' });

    const { error } = await supabase.from('votes').insert({
      week_number,
      voter_id: req.user.id,
      voted_for_id,
      vote_type
    });

    if (error) return res.status(500).json({ error: 'Erro ao registrar voto' });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/votes/status - Check if user voted this week
router.get('/status', auth, async (req, res) => {
  try {
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: vote } = await supabase
      .from('votes')
      .select('*, users!voted_for_id(name)')
      .eq('week_number', week_number)
      .eq('voter_id', req.user.id)
      .eq('vote_type', 'paredao')
      .single();

    return res.json({ voted: !!vote, vote });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/votes/results - Admin: get vote results
router.get('/results', auth, adminOnly, async (req, res) => {
  try {
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: votes, error } = await supabase
      .from('votes')
      .select('voted_for_id, users!voted_for_id(name, photo_url)')
      .eq('week_number', week_number)
      .eq('vote_type', 'paredao');

    if (error) return res.status(500).json({ error: 'Erro ao buscar votos' });

    // Count votes per user
    const counts = {};
    (votes || []).forEach(v => {
      const uid = v.voted_for_id;
      if (!counts[uid]) counts[uid] = { user: v.users, count: 0 };
      counts[uid].count++;
    });

    const results = Object.values(counts).sort((a, b) => b.count - a.count);
    return res.json({ results, total: votes?.length || 0, week_number });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
