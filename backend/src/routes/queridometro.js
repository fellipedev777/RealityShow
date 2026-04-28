const express = require('express');
const supabase = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

const RATINGS = [
  { emoji: '❤️', value: 4, label: 'Amo' },
  { emoji: '😊', value: 3, label: 'Gosto' },
  { emoji: '😐', value: 2, label: 'Normal' },
  { emoji: '😤', value: 1, label: 'Não gosto' },
];

// POST /api/queridometro/rate
router.post('/rate', auth, async (req, res) => {
  try {
    const { rated_id, emoji } = req.body;
    if (!rated_id || !emoji) return res.status(400).json({ error: 'Dados inválidos' });
    if (rated_id === req.user.id) return res.status(400).json({ error: 'Você não pode se avaliar' });

    const rating = RATINGS.find(r => r.emoji === emoji);
    if (!rating) return res.status(400).json({ error: 'Emoji inválido' });

    const { data: existing } = await supabase
      .from('queridometro_ratings')
      .select('rated_id')
      .eq('rater_id', req.user.id)
      .eq('rated_id', rated_id)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'Você já avaliou esta pessoa' });

    await supabase.from('queridometro_ratings').insert({
      rater_id: req.user.id,
      rated_id,
      emoji,
      value: rating.value,
      updated_at: new Date().toISOString()
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/queridometro/results
router.get('/results', auth, async (req, res) => {
  try {
    const { data: ratings } = await supabase
      .from('queridometro_ratings')
      .select('rated_id, value, users!rated_id(name, photo_url)');

    const counts = {};
    (ratings || []).forEach(r => {
      const id = r.rated_id;
      if (!counts[id]) counts[id] = { user: r.users, total: 0, count: 0 };
      counts[id].total += r.value;
      counts[id].count++;
    });

    const results = Object.values(counts)
      .map(r => ({ ...r, avg: r.count > 0 ? parseFloat((r.total / r.count).toFixed(1)) : 0 }))
      .sort((a, b) => b.avg - a.avg);

    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/queridometro/my-ratings
router.get('/my-ratings', auth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('queridometro_ratings')
      .select('rated_id, emoji')
      .eq('rater_id', req.user.id);

    const myRatings = {};
    (data || []).forEach(r => { myRatings[r.rated_id] = r.emoji; });
    return res.json({ myRatings });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
