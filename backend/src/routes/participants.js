const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/participants
router.get('/', auth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, photo_url, is_admin, is_active, is_eliminated, eliminated_at, created_at')
      .order('name');

    if (error) return res.status(500).json({ error: 'Erro ao buscar participantes' });
    return res.json({ participants: users });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/participants/active
router.get('/active', auth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, photo_url, is_eliminated, room_participants(room_id, rooms(name, slug, color, icon))')
      .eq('is_active', true)
      .eq('is_admin', false)
      .eq('is_eliminated', false)
      .order('name');

    if (error) return res.status(500).json({ error: 'Erro ao buscar participantes' });
    return res.json({ participants: users });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/participants/:id - Admin updates participant
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { is_active, is_eliminated, is_admin } = req.body;
    const updates = {};
    if (typeof is_active !== 'undefined') updates.is_active = is_active;
    if (typeof is_eliminated !== 'undefined') {
      updates.is_eliminated = is_eliminated;
      if (is_eliminated) updates.eliminated_at = new Date().toISOString();
    }
    if (typeof is_admin !== 'undefined') updates.is_admin = is_admin;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao atualizar participante' });
    return res.json({ participant: data });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/participants/game-state
router.get('/info/game-state', auth, async (req, res) => {
  try {
    const { data: stateRows, error } = await supabase
      .from('game_state')
      .select('key, value');

    if (error) return res.status(500).json({ error: 'Erro ao buscar estado do jogo' });

    const state = {};
    (stateRows || []).forEach(row => {
      try { state[row.key] = JSON.parse(row.value); } catch { state[row.key] = row.value; }
    });

    return res.json({ state });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
