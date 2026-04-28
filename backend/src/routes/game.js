const express = require('express');
const supabase = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/game/anjo-choose — Angel immunizes someone
router.post('/anjo-choose', auth, async (req, res) => {
  try {
    const { immune_user_id } = req.body;
    if (!immune_user_id) return res.status(400).json({ error: 'Dados inválidos' });
    if (immune_user_id === req.user.id) return res.status(400).json({ error: 'Você não pode se imunizar' });

    const { data: angelRow } = await supabase
      .from('game_state').select('value').eq('key', 'current_angel_id').single();
    const angelId = angelRow?.value?.replace(/"/g, '');
    if (angelId !== req.user.id) return res.status(403).json({ error: 'Você não é o Anjo desta semana' });

    const { data: choosingRow } = await supabase
      .from('game_state').select('value').eq('key', 'anjo_choosing').single();
    if (choosingRow?.value !== 'true') return res.status(400).json({ error: 'Não é o momento da escolha do Anjo' });

    await Promise.all([
      supabase.from('game_state').upsert({ key: 'immune_user_id', value: JSON.stringify(immune_user_id) }, { onConflict: 'key' }),
      supabase.from('game_state').upsert({ key: 'anjo_choosing', value: 'false' }, { onConflict: 'key' }),
    ]);

    const { data: immuneUser } = await supabase.from('users').select('name').eq('id', immune_user_id).single();

    // Emit via io available on app
    const io = req.app.get('io');
    if (io) {
      io.emit('anjo_chose', { immune_user_id, immune_user_name: immuneUser?.name, reason: req.body.reason || '' });
    }

    return res.json({ success: true, immune_user: immuneUser });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/game/lider-indicate — Leader nominates someone directly to paredão
router.post('/lider-indicate', auth, async (req, res) => {
  try {
    const { indicated_user_id } = req.body;
    if (!indicated_user_id) return res.status(400).json({ error: 'Dados inválidos' });
    if (indicated_user_id === req.user.id) return res.status(400).json({ error: 'Você não pode se indicar' });

    const { data: leaderRow } = await supabase
      .from('game_state').select('value').eq('key', 'current_leader_id').single();
    const leaderId = leaderRow?.value?.replace(/"/g, '');
    if (leaderId !== req.user.id) return res.status(403).json({ error: 'Você não é o Líder desta semana' });

    const { data: indicatingRow } = await supabase
      .from('game_state').select('value').eq('key', 'lider_indicating').single();
    if (indicatingRow?.value !== 'true') return res.status(400).json({ error: 'Não é o momento da indicação do Líder' });

    const { data: immuneRow } = await supabase
      .from('game_state').select('value').eq('key', 'immune_user_id').single();
    const immuneId = immuneRow?.value?.replace(/"/g, '');
    if (immuneId === indicated_user_id) return res.status(400).json({ error: 'Este participante está imunizado' });

    await Promise.all([
      supabase.from('game_state').upsert({ key: 'leader_indication', value: JSON.stringify(indicated_user_id) }, { onConflict: 'key' }),
      supabase.from('game_state').upsert({ key: 'lider_indicating', value: 'false' }, { onConflict: 'key' }),
    ]);

    const { data: indicatedUser } = await supabase.from('users').select('name').eq('id', indicated_user_id).single();

    const io = req.app.get('io');
    if (io) {
      io.emit('lider_indicated', { indicated_user_id, indicated_user_name: indicatedUser?.name, reason: req.body.reason || '' });
    }

    return res.json({ success: true, indicated_user: indicatedUser });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
