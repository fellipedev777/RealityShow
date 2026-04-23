const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, photo_url } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Block registrations after game has started
    const { data: gameStartedRow } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'game_started')
      .single();

    if (gameStartedRow?.value === 'true') {
      return res.status(403).json({ error: 'game_started' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        photo_url: photo_url || null,
        is_admin: false
      })
      .select('id, name, email, photo_url, is_admin, is_active')
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao criar usuário' });

    // Put user in Sala Principal by default
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', 'sala-principal')
      .single();

    if (room) {
      await supabase.from('room_participants').upsert({ room_id: room.id, user_id: user.id });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, photo_url, password_hash, is_admin, is_active, is_eliminated')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!user.is_active) return res.status(403).json({ error: 'Conta desativada' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const { password_hash, ...userSafe } = user;
    return res.json({ user: userSafe, token });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
