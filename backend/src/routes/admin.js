const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/start-game - Start the BBB game
router.post('/start-game', auth, adminOnly, async (req, res) => {
  try {
    const updates = [
      { key: 'game_started', value: 'true' },
      { key: 'game_started_at', value: JSON.stringify(new Date().toISOString()) },
      { key: 'current_week', value: '1' },
      { key: 'current_day', value: '1' }
    ];

    for (const update of updates) {
      await supabase.from('game_state').upsert(update, { onConflict: 'key' });
    }

    // Randomly assign participants to rooms
    const { data: participants } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', false)
      .eq('is_active', true)
      .eq('is_eliminated', false);

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, slug')
      .neq('slug', 'quarto-lider')
      .neq('slug', 'sala-principal');

    if (participants && rooms && rooms.length > 0) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const assignments = shuffled.map((p, i) => ({
        user_id: p.id,
        room_id: rooms[i % rooms.length].id
      }));

      await supabase.from('room_participants').upsert(assignments, { onConflict: 'user_id' });
    }

    return res.json({ success: true, message: 'Jogo iniciado!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/update-state - Update game state
router.post('/update-state', auth, adminOnly, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Chave é obrigatória' });

    // Store raw string for UUIDs to avoid double-encoding issues
    const storedValue = (typeof value === 'string') ? value : JSON.stringify(value);

    const { error } = await supabase
      .from('game_state')
      .upsert({ key, value: storedValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) return res.status(500).json({ error: 'Erro ao atualizar estado' });

    // When setting leader, automatically move them to quarto-lider
    if (key === 'current_leader_id' && value) {
      const { data: leaderRoom } = await supabase
        .from('rooms').select('id').eq('slug', 'quarto-lider').single();
      if (leaderRoom) {
        await supabase.from('room_participants')
          .upsert({ room_id: leaderRoom.id, user_id: value }, { onConflict: 'user_id' });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/open-sincerao - Open Sincerão
router.post('/open-sincerao', auth, adminOnly, async (req, res) => {
  try {
    const { theme } = req.body;

    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    await supabase.from('sincerao_events').upsert({
      week_number,
      theme: theme || 'Tema livre',
      is_active: true,
      started_at: new Date().toISOString()
    }, { onConflict: 'week_number' });

    await supabase.from('game_state').upsert(
      { key: 'sincerao_active', value: 'true' },
      { onConflict: 'key' }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/close-sincerao
router.post('/close-sincerao', auth, adminOnly, async (req, res) => {
  try {
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    await supabase.from('sincerao_events')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('week_number', week_number);

    await supabase.from('game_state').upsert(
      { key: 'sincerao_active', value: 'false' },
      { onConflict: 'key' }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/open-public-voting
router.post('/open-public-voting', auth, adminOnly, async (req, res) => {
  try {
    await supabase.from('game_state').upsert(
      { key: 'public_voting_active', value: 'true' },
      { onConflict: 'key' }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/close-public-voting
router.post('/close-public-voting', auth, adminOnly, async (req, res) => {
  try {
    await supabase.from('game_state').upsert(
      { key: 'public_voting_active', value: 'false' },
      { onConflict: 'key' }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/open-votacao
router.post('/open-votacao', auth, adminOnly, async (req, res) => {
  try {
    await supabase.from('game_state').upsert(
      { key: 'votacao_active', value: 'true' },
      { onConflict: 'key' }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/close-votacao - Close voting and build paredão
router.post('/close-votacao', auth, adminOnly, async (req, res) => {
  try {
    await supabase.from('game_state').upsert(
      { key: 'votacao_active', value: 'false' },
      { onConflict: 'key' }
    );

    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    const { data: votes } = await supabase
      .from('votes')
      .select('voted_for_id')
      .eq('week_number', week_number)
      .eq('vote_type', 'paredao');

    const counts = {};
    (votes || []).forEach(v => {
      counts[v.voted_for_id] = (counts[v.voted_for_id] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top2 = sorted.slice(0, 2).map(([id]) => id);

    // Add leader's indication if any
    const { data: leaderIndication } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'leader_indication')
      .single();

    if (leaderIndication?.value && !top2.includes(leaderIndication.value.replace(/"/g, ''))) {
      top2.push(leaderIndication.value.replace(/"/g, ''));
    }

    // Remove immune user
    const { data: immuneRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'immune_user_id')
      .single();

    const immuneId = immuneRow?.value?.replace(/"/g, '');
    const paredaoUsers = top2.filter(id => id !== immuneId);

    const voteCounts = {};
    paredaoUsers.forEach(id => { voteCounts[id] = counts[id] || 0; });

    await supabase.from('paredao').upsert({
      week_number,
      participants: paredaoUsers,
      vote_counts: voteCounts,
      status: 'active'
    }, { onConflict: 'week_number' });

    await supabase.from('game_state').upsert(
      { key: 'paredao_users', value: JSON.stringify(paredaoUsers) },
      { onConflict: 'key' }
    );

    return res.json({ success: true, paredao: paredaoUsers });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/eliminate - Eliminate participant
router.post('/eliminate', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, speech: customSpeech } = req.body;

    const { data: user } = await supabase
      .from('users')
      .update({ is_eliminated: true, eliminated_at: new Date().toISOString() })
      .eq('id', user_id)
      .select('name')
      .single();

    const speeches = [
      `${user?.name}, sua jornada no LiveReality chegou ao fim! O público decidiu e você deixa a casa com muito mais experiência. Obrigado por tudo!`,
      `A casa perdeu um participante incrível! ${user?.name}, você jogou com garra e personalidade. Até mais!`,
      `${user?.name}, você deixou sua marca na história do LiveReality! Foi uma jornada emocionante. A vida fora da casa te aguarda!`,
      `É a hora da despedida! ${user?.name}, o público votou e decidiu encerrar sua participação. Que venham novos desafios!`
    ];

    const speech = (customSpeech && customSpeech.trim()) ? customSpeech.trim() : speeches[Math.floor(Math.random() * speeches.length)];

    // Move eliminated to main room
    const { data: mainRoom } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', 'sala-principal')
      .single();

    if (mainRoom) {
      await supabase.from('room_participants').upsert(
        { room_id: mainRoom.id, user_id },
        { onConflict: 'user_id' }
      );
    }

    // Update game state
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const week_number = parseInt(stateRow?.value) || 1;

    await supabase.from('paredao')
      .update({ eliminated_id: user_id, status: 'eliminated', resolved_at: new Date().toISOString() })
      .eq('week_number', week_number);

    // Clear paredão state
    await supabase.from('game_state').upsert(
      { key: 'paredao_users', value: '[]' },
      { onConflict: 'key' }
    );

    return res.json({ success: true, speech, eliminated: user?.name });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/next-week
router.post('/next-week', auth, adminOnly, async (req, res) => {
  try {
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'current_week')
      .single();

    const currentWeek = parseInt(stateRow?.value) || 1;

    await supabase.from('game_state').upsert([
      { key: 'current_week', value: String(currentWeek + 1) },
      { key: 'current_leader_id', value: 'null' },
      { key: 'current_angel_id', value: 'null' },
      { key: 'immune_user_id', value: 'null' },
      { key: 'paredao_users', value: '[]' },
      { key: 'votacao_active', value: 'false' },
      { key: 'sincerao_active', value: 'false' },
      { key: 'leader_indication', value: 'null' }
    ], { onConflict: 'key' });

    return res.json({ success: true, new_week: currentWeek + 1 });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /admin/import-forms-votes - Import votes from Google Forms via Sheets CSV
router.post('/import-forms-votes', auth, adminOnly, async (req, res) => {
  try {
    const { sheet_url } = req.body;
    if (!sheet_url) return res.status(400).json({ error: 'URL da planilha é obrigatória' });

    const match = sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return res.status(400).json({ error: 'URL inválida. Use o link do Google Sheets.' });

    const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;

    let csvText;
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) return res.status(400).json({ error: 'Planilha não acessível. Deixe-a pública (qualquer pessoa com o link pode ver).' });
      csvText = await response.text();
    } catch {
      return res.status(400).json({ error: 'Não foi possível acessar a planilha.' });
    }

    const lines = csvText.split('\n').slice(1).filter(l => l.trim());

    const { data: stateRow } = await supabase.from('game_state').select('value').eq('key', 'current_week').single();
    const week_number = parseInt(stateRow?.value) || 1;

    const { data: participants } = await supabase.from('users').select('id, name')
      .eq('is_active', true).eq('is_eliminated', false).eq('is_admin', false);

    const counts = {};
    let skipped = 0;

    for (const line of lines) {
      const cols = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cols.push(cur.trim());

      const votedName = cols[1]?.replace(/^"|"$/g, '').trim();
      if (!votedName) { skipped++; continue; }

      const p = participants?.find(p =>
        p.name.toLowerCase() === votedName.toLowerCase() ||
        p.name.toLowerCase().includes(votedName.toLowerCase()) ||
        votedName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (p) counts[p.id] = (counts[p.id] || 0) + 1;
      else skipped++;
    }

    await supabase.from('game_state').upsert(
      { key: `forms_votes_week_${week_number}`, value: JSON.stringify(counts) },
      { onConflict: 'key' }
    );

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return res.json({ success: true, imported: total, skipped, week_number });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /admin/forms-votes-results - Get imported Forms vote results
router.get('/forms-votes-results', auth, adminOnly, async (req, res) => {
  try {
    const { data: stateRow } = await supabase.from('game_state').select('value').eq('key', 'current_week').single();
    const week_number = parseInt(stateRow?.value) || 1;

    const { data: formsRow } = await supabase.from('game_state').select('value')
      .eq('key', `forms_votes_week_${week_number}`).single();
    const counts = formsRow?.value ? JSON.parse(formsRow.value) : {};

    if (Object.keys(counts).length === 0) return res.json({ results: [], total: 0, week_number });

    const { data: users } = await supabase.from('users').select('id, name, photo_url').in('id', Object.keys(counts));

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const results = Object.keys(counts)
      .map(id => ({
        user: users?.find(u => u.id === id),
        count: counts[id],
        percentage: total > 0 ? Math.round((counts[id] / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({ results, total, week_number });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/admin/dashboard - Full admin stats
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    const [
      { data: participants },
      { data: stateRows },
      { data: recentMessages }
    ] = await Promise.all([
      supabase.from('users').select('id, name, email, photo_url, is_eliminated, is_active, is_admin').order('name'),
      supabase.from('game_state').select('key, value'),
      supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    const state = {};
    (stateRows || []).forEach(row => {
      try { state[row.key] = JSON.parse(row.value); } catch { state[row.key] = row.value; }
    });

    return res.json({ participants, state, recentMessages });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
