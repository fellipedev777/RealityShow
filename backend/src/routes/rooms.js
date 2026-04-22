const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/rooms - List all rooms
router.get('/', auth, async (req, res) => {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_participants(
          user_id,
          users(id, name, photo_url, is_eliminated)
        )
      `)
      .order('name');

    if (error) return res.status(500).json({ error: 'Erro ao buscar quartos' });
    return res.json({ rooms });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/rooms/:slug - Get room details
router.get('/:slug', auth, async (req, res) => {
  try {
    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_participants(
          user_id,
          users(id, name, photo_url)
        )
      `)
      .eq('slug', req.params.slug)
      .single();

    if (error || !room) return res.status(404).json({ error: 'Quarto não encontrado' });

    // Check access for restricted rooms
    if (room.is_restricted && !req.user.is_admin) {
      const { data: state } = await supabase
        .from('game_state')
        .select('value')
        .eq('key', 'current_leader_id')
        .single();

      // Parse the stored JSONB value robustly
      let leaderId = null;
      if (state?.value) {
        try { leaderId = JSON.parse(state.value); } catch { leaderId = String(state.value); }
        if (typeof leaderId === 'string') leaderId = leaderId.replace(/"/g, '').trim();
      }

      if (room.slug === 'quarto-lider' && req.user.id !== leaderId) {
        return res.status(403).json({ error: 'Acesso restrito ao Líder da semana' });
      }

      // Auto-add leader to the room so the participant list is correct
      if (room.slug === 'quarto-lider' && req.user.id === leaderId) {
        await supabase.from('room_participants')
          .upsert({ room_id: room.id, user_id: req.user.id }, { onConflict: 'user_id' });
      }
    }

    // Get recent messages
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return res.json({ room, messages: (messages || []).reverse() });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rooms/join - Join a room
router.post('/join', auth, async (req, res) => {
  try {
    const { room_slug, password } = req.body;

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('slug', room_slug)
      .single();

    if (error || !room) return res.status(404).json({ error: 'Quarto não encontrado' });

    if (room.password && room.password !== password && !req.user.is_admin) {
      return res.status(403).json({ error: 'Senha incorreta' });
    }

    const { error: joinError } = await supabase
      .from('room_participants')
      .upsert({ room_id: room.id, user_id: req.user.id });

    if (joinError) return res.status(500).json({ error: 'Erro ao entrar no quarto' });

    return res.json({ success: true, room });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/rooms/:id/move - Admin moves participant to room
router.post('/:id/move', auth, adminOnly, async (req, res) => {
  try {
    const { user_id } = req.body;

    const { error } = await supabase
      .from('room_participants')
      .upsert({ room_id: req.params.id, user_id });

    if (error) return res.status(500).json({ error: 'Erro ao mover participante' });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
