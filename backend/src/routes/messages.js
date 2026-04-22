const express = require('express');
const supabase = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - List all conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get latest message per conversation partner
    const { data: sent } = await supabase
      .from('private_messages')
      .select('id, sender_id, receiver_id, content, created_at, read_at')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('private_messages')
      .select('id, sender_id, receiver_id, content, created_at, read_at')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    // Merge and get unique partners
    const allMessages = [...(sent || []), ...(received || [])];
    const partnerMap = {};

    allMessages.forEach(msg => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!partnerMap[partnerId] || new Date(msg.created_at) > new Date(partnerMap[partnerId].created_at)) {
        partnerMap[partnerId] = { ...msg, partnerId };
      }
    });

    // Count unread per partner
    const unreadCounts = {};
    (received || []).forEach(msg => {
      if (!msg.read_at) {
        unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
      }
    });

    // Fetch partner user info
    const partnerIds = Object.keys(partnerMap);
    if (partnerIds.length === 0) return res.json({ conversations: [] });

    const { data: users } = await supabase
      .from('users')
      .select('id, name, photo_url, is_eliminated')
      .in('id', partnerIds);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u; });

    const conversations = Object.values(partnerMap)
      .map(msg => ({
        partner: userMap[msg.partnerId],
        lastMessage: msg.content,
        lastMessageAt: msg.created_at,
        unread: unreadCounts[msg.partnerId] || 0,
        isMine: msg.sender_id === userId
      }))
      .filter(c => c.partner)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    return res.json({ conversations });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/messages/:partnerId - Get conversation with a specific user
router.get('/:partnerId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    const { data: partner } = await supabase
      .from('users')
      .select('id, name, photo_url')
      .eq('id', partnerId)
      .single();

    if (!partner) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data: messages, error } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) return res.status(500).json({ error: 'Erro ao buscar mensagens' });

    // Mark received messages as read
    await supabase
      .from('private_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('sender_id', partnerId)
      .is('read_at', null);

    return res.json({ partner, messages: messages || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/messages/:partnerId - Send a private message (REST fallback)
router.post('/:partnerId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

    const { data: msg, error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: req.user.id,
        receiver_id: req.params.partnerId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao enviar mensagem' });

    return res.status(201).json({ message: msg });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/messages/unread/count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const { count } = await supabase
      .from('private_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', req.user.id)
      .is('read_at', null);

    return res.json({ count: count || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
