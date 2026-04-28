const jwt = require('jsonwebtoken');
const supabase = require('../config/database');

// Active prova timers
const provaTimers = {};
// Current question state per prova (sent to late joiners)
const activeProvaState = {}; // prova_id -> { provaInfo, questionData }
// Debounce timers for prova scores broadcast (prova_id -> timeout)
const scoreBroadcastTimers = {};
// Active users in rooms: roomId -> Set of socket ids
const roomSockets = {};
// socket.id -> { userId, userName, roomId }
const socketUsers = {};
// Per-socket message timestamps for rate limiting
const lastMessageTime = {};

module.exports = (io) => {
  // JWT Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user } = await supabase
        .from('users')
        .select('id, name, photo_url, is_admin, is_eliminated')
        .eq('id', decoded.id)
        .single();

      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.name} (${socket.id})`);

    socketUsers[socket.id] = { userId: user.id, userName: user.name, roomId: null };

    // Emit current game state to newly connected user
    emitGameState(socket);

    // If a prova is active, send the current question to the late joiner
    const activeEntry = Object.values(activeProvaState)[0];
    if (activeEntry?.questionData) {
      socket.emit('prova_started', activeEntry.provaInfo);
      socket.emit('prova_question', activeEntry.questionData);
    }

    // ─── JOIN ROOM ───────────────────────────────────────────
    socket.on('join_room', async ({ room_id }) => {
      // Leave previous room
      const prev = socketUsers[socket.id]?.roomId;
      if (prev) {
        socket.leave(prev);
        socket.to(prev).emit('user_left_room', { userId: user.id, userName: user.name });
      }

      socket.join(room_id);
      socketUsers[socket.id].roomId = room_id;

      // Save to DB
      await supabase.from('room_participants').upsert(
        { room_id, user_id: user.id },
        { onConflict: 'user_id' }
      );

      // System message
      const { data: room } = await supabase.from('rooms').select('name').eq('id', room_id).single();
      const sysMsg = {
        id: Date.now().toString(),
        room_id,
        user_name: 'Sistema',
        content: `${user.name} entrou no ${room?.name || 'quarto'}`,
        is_system: true,
        created_at: new Date().toISOString()
      };

      await supabase.from('chat_messages').insert(sysMsg);
      io.to(room_id).emit('chat_message', sysMsg);
      socket.to(room_id).emit('user_joined_room', { userId: user.id, userName: user.name, room_id });
    });

    // ─── CHAT MESSAGE ────────────────────────────────────────
    socket.on('send_message', async ({ room_id, content }) => {
      if (!content?.trim() || content.length > 500) return;

      // Rate limit: 1 message per second per socket
      const now = Date.now();
      if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) return;
      lastMessageTime[socket.id] = now;

      const message = {
        room_id,
        user_id: user.id,
        user_name: user.name,
        user_photo: user.photo_url,
        content: content.trim(),
        is_system: false,
        is_admin: user.is_admin,
        created_at: new Date().toISOString()
      };

      const { data: saved } = await supabase.from('chat_messages').insert(message).select().single();
      io.to(room_id).emit('chat_message', saved || { ...message, id: Date.now().toString() });
    });

    // ─── ADMIN BROADCAST ─────────────────────────────────────
    socket.on('admin_announcement', async ({ content, type = 'info' }) => {
      if (!user.is_admin) return;

      const announcement = {
        id: Date.now().toString(),
        content,
        type,
        from: 'Administrador',
        created_at: new Date().toISOString()
      };

      await supabase.from('announcements').insert({
        content,
        type,
        created_by: user.id,
        is_global: true
      });

      io.emit('announcement', announcement);
    });

    // ─── START PROVA ─────────────────────────────────────────
    socket.on('admin_start_prova', async ({ prova_id }) => {
      if (!user.is_admin) return;

      const { data: prova } = await supabase
        .from('provas')
        .select('*, questions(*)')
        .eq('id', prova_id)
        .single();

      if (!prova) return;

      await supabase.from('provas').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', prova_id);

      const questions = [...(prova.questions || [])].sort((a, b) => a.order_index - b.order_index);

      const provaInfo = { prova_id, type: prova.type, title: prova.title, total_questions: questions.length };
      io.emit('prova_started', provaInfo);
      activeProvaState[prova_id] = { provaInfo, questionData: null };

      // Send questions one by one with timer
      let qIndex = 0;
      const sendNextQuestion = () => {
        if (qIndex >= questions.length) {
          delete activeProvaState[prova_id];
          endProva(prova_id, prova.type);
          return;
        }

        const q = questions[qIndex];
        const questionData = {
          prova_id,
          question_index: qIndex,
          total: questions.length,
          question: {
            id: q.id,
            text: q.question_text,
            options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
          },
          time_limit: prova.time_per_question || 15
        };

        io.emit('prova_question', questionData);
        activeProvaState[prova_id] = { provaInfo, questionData };

        qIndex++;
        provaTimers[prova_id] = setTimeout(sendNextQuestion, (prova.time_per_question + 2) * 1000);
      };

      sendNextQuestion();
    });

    // ─── PROVA ANSWER ────────────────────────────────────────
    socket.on('prova_answer', async ({ prova_id, question_id, answer }) => {
      const { data: question } = await supabase
        .from('questions')
        .select('correct_answer')
        .eq('id', question_id)
        .single();

      if (!question) return;

      const is_correct = question.correct_answer === answer?.toUpperCase();

      await supabase.from('prova_answers').upsert({
        prova_id, question_id, user_id: user.id,
        answer: answer?.toUpperCase(), is_correct
      });

      // Update score
      const { data: existing } = await supabase
        .from('prova_scores')
        .select('*')
        .eq('prova_id', prova_id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase.from('prova_scores').update({
          score: existing.score + (is_correct ? 10 : 0),
          answers_count: existing.answers_count + 1,
          correct_count: existing.correct_count + (is_correct ? 1 : 0),
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('prova_scores').insert({
          prova_id, user_id: user.id,
          score: is_correct ? 10 : 0,
          answers_count: 1,
          correct_count: is_correct ? 1 : 0
        });
      }

      socket.emit('answer_result', { question_id, is_correct, correct_answer: question.correct_answer });

      // Debounce scores broadcast: wait 800ms after last answer before querying+broadcasting
      if (scoreBroadcastTimers[prova_id]) clearTimeout(scoreBroadcastTimers[prova_id]);
      scoreBroadcastTimers[prova_id] = setTimeout(async () => {
        const { data: scores } = await supabase
          .from('prova_scores')
          .select('*, users(name, photo_url)')
          .eq('prova_id', prova_id)
          .order('score', { ascending: false });
        io.emit('prova_scores_update', { prova_id, scores });
        delete scoreBroadcastTimers[prova_id];
      }, 800);
    });

    // ─── SINCERAO COMMENT ────────────────────────────────────
    socket.on('sincerao_comment', async ({ target_id, comment }) => {
      if (!comment?.trim()) return;

      const { data: stateRow } = await supabase
        .from('game_state').select('value').eq('key', 'sincerao_active').single();

      if (stateRow?.value !== 'true') return;

      const { data: weekRow } = await supabase
        .from('game_state').select('value').eq('key', 'current_week').single();

      const week_number = parseInt(weekRow?.value) || 1;

      const { data: sincerao } = await supabase
        .from('sincerao_events').select('id').eq('week_number', week_number).single();

      if (!sincerao) return;

      const { data: target } = await supabase.from('users').select('name').eq('id', target_id).single();

      const { data: newComment } = await supabase.from('sincerao_comments').insert({
        sincerao_id: sincerao.id,
        author_id: user.id, target_id,
        comment: comment.trim(),
        author_name: user.name,
        target_name: target?.name
      }).select().single();

      io.emit('sincerao_new_comment', newComment);
    });

    // ─── ADMIN EVENTS ────────────────────────────────────────
    socket.on('admin_event', async ({ event, data: eventData }) => {
      if (!user.is_admin) return;

      switch (event) {
        case 'open_sincerao':
          io.emit('sincerao_opened', { theme: eventData?.theme, opened_at: new Date().toISOString() });
          break;
        case 'close_sincerao':
          io.emit('sincerao_closed', {});
          break;
        case 'open_votacao':
          io.emit('votacao_opened', { week: eventData?.week });
          break;
        case 'close_votacao':
          io.emit('votacao_closed', {});
          break;
        case 'paredao_formed':
          io.emit('paredao_formed', eventData);
          break;
        case 'elimination':
          io.emit('participant_eliminated', eventData);
          break;
        case 'set_leader':
          io.emit('leader_set', eventData);
          break;
        case 'set_angel':
          io.emit('angel_set', eventData);
          break;
        case 'move_participant':
          io.emit('participant_moved', eventData);
          break;
        case 'next_week':
          io.emit('new_week', eventData);
          break;
        case 'end_game':
          io.emit('reality_ended', eventData);
          break;
        case 'survivor_celebration':
          io.emit('survivor_celebration', eventData);
          break;
        case 'open_anjo_choice':
          io.emit('anjo_choosing_open', eventData);
          break;
        case 'open_lider_indication':
          io.emit('lider_indicating_open', eventData);
          break;
      }
    });

    // ─── REQUEST SCORES UPDATE ───────────────────────────────
    socket.on('request_scores', async ({ prova_id }) => {
      const { data: scores } = await supabase
        .from('prova_scores')
        .select('*, users(name, photo_url)')
        .eq('prova_id', prova_id)
        .order('score', { ascending: false });

      socket.emit('prova_scores_update', { prova_id, scores });
    });

    // ─── PRIVATE MESSAGE ─────────────────────────────────────
    socket.on('private_message', async ({ receiver_id, content }) => {
      if (!content?.trim() || !receiver_id) return;
      if (content.length > 1000) return;

      const { data: msg } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          receiver_id,
          content: content.trim()
        })
        .select()
        .single();

      if (!msg) return;

      const payload = {
        ...msg,
        sender: { id: user.id, name: user.name, photo_url: user.photo_url }
      };

      // Send to recipient's personal room
      io.to(`user_${receiver_id}`).emit('private_message', payload);
      // Echo back to sender (might be on multiple tabs)
      io.to(`user_${user.id}`).emit('private_message', payload);
    });

    // Join personal room to receive private messages
    socket.join(`user_${user.id}`);

    // ─── MARK READ ───────────────────────────────────────────
    socket.on('mark_read', async ({ sender_id }) => {
      await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', user.id)
        .eq('sender_id', sender_id)
        .is('read_at', null);

      // Notify sender that messages were read
      io.to(`user_${sender_id}`).emit('messages_read', { by: user.id });
    });

    // ─── DISCONNECT ──────────────────────────────────────────
    socket.on('disconnect', () => {
      const info = socketUsers[socket.id];
      if (info?.roomId) {
        socket.to(info.roomId).emit('user_left_room', { userId: info.userId, userName: info.userName });
      }
      delete socketUsers[socket.id];
      delete lastMessageTime[socket.id];
      console.log(`[Socket] Disconnected: ${user.name}`);
    });
  });

  // ─── HELPERS ─────────────────────────────────────────────
  async function emitGameState(socket) {
    const { data: stateRows } = await supabase.from('game_state').select('key, value');
    const state = {};
    (stateRows || []).forEach(row => {
      try { state[row.key] = JSON.parse(row.value); } catch { state[row.key] = row.value; }
    });
    socket.emit('game_state', state);
  }

  async function endProva(prova_id, type) {
    if (provaTimers[prova_id]) clearTimeout(provaTimers[prova_id]);
    delete provaTimers[prova_id];

    const { data: scores } = await supabase
      .from('prova_scores')
      .select('*, users(id, name, photo_url)')
      .eq('prova_id', prova_id)
      .order('score', { ascending: false });

    await supabase.from('provas').update({
      status: 'finished',
      ended_at: new Date().toISOString(),
      winner_id: scores?.[0]?.user_id || null
    }).eq('id', prova_id);

    const winner = scores?.[0];

    if (winner) {
      const stateKey = type === 'lider' ? 'current_leader_id' : type === 'anjo' ? 'current_angel_id' : null;
      if (stateKey) {
        await supabase.from('game_state').upsert(
          { key: stateKey, value: JSON.stringify(winner.user_id) },
          { onConflict: 'key' }
        );
      }

      // If leader, unlock quarto lider
      if (type === 'lider') {
        const { data: leaderRoom } = await supabase.from('rooms').select('id').eq('slug', 'quarto-lider').single();
        if (leaderRoom) {
          await supabase.from('room_participants').upsert(
            { room_id: leaderRoom.id, user_id: winner.user_id },
            { onConflict: 'user_id' }
          );
        }
      }
    }

    io.emit('prova_ended', {
      prova_id, type, scores,
      winner: winner?.users,
      winner_score: winner?.score
    });
  }
};
