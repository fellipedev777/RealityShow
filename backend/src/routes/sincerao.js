const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/sincerao/current
router.get('/current', auth, async (req, res) => {
  try {
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: sincerao } = await supabase
      .from('sincerao_events')
      .select(`
        *,
        sincerao_comments(
          *,
          users!author_id(name, photo_url),
          users!target_id(name, photo_url)
        )
      `)
      .eq('week_number', week_number)
      .single();

    return res.json({ sincerao });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/sincerao/comment - Submit comment
router.post('/comment', auth, async (req, res) => {
  try {
    const { target_id, comment } = req.body;
    if (!target_id || !comment?.trim()) {
      return res.status(400).json({ error: 'Destinatário e comentário são obrigatórios' });
    }

    const { data: activeState } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'sincerao_active')
      .single();

    if (activeState?.value !== 'true') {
      return res.status(403).json({ error: 'Sincerão não está ativo' });
    }

    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: sincerao } = await supabase
      .from('sincerao_events')
      .select('id')
      .eq('week_number', week_number)
      .single();

    if (!sincerao) return res.status(404).json({ error: 'Sincerão não encontrado' });

    const { data: target } = await supabase
      .from('users')
      .select('name')
      .eq('id', target_id)
      .single();

    const { data: newComment, error } = await supabase
      .from('sincerao_comments')
      .insert({
        sincerao_id: sincerao.id,
        author_id: req.user.id,
        target_id,
        comment: comment.trim(),
        author_name: req.user.name,
        target_name: target?.name
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao salvar comentário' });

    return res.status(201).json({ comment: newComment });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/sincerao/history
router.get('/history', auth, async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('sincerao_events')
      .select(`
        *,
        sincerao_comments(id, author_name, target_name, comment, created_at)
      `)
      .order('week_number', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erro ao buscar histórico' });
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
