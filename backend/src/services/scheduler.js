const cron = require('node-cron');
const supabase = require('../config/database');

let io;

const setIO = (socketIO) => { io = socketIO; };

const SCHEDULE = {
  1: { type: 'prova_lider',  title: 'Prova do Líder',    description: 'Dispute o comando da semana!' },
  2: { type: 'prova_anjo',   title: 'Prova do Anjo',     description: 'Conquiste a imunidade!' },
  3: { type: 'sincerao',     title: 'Sincerão',           description: 'Hora da verdade!' },
  4: { type: 'votacao',      title: 'Votação',            description: 'Vote para o paredão!' },
  5: { type: 'bate_volta',   title: 'Bate e Volta',       description: 'Chance de escapar do paredão!' },
  6: { type: 'eliminacao',   title: 'Eliminação',         description: 'Quem deixa a casa hoje?' },
  0: { type: 'convivencia',  title: 'Dia de Convivência', description: 'Descanse e conviva com a galera!' }
};

const start = () => {
  // Check daily at 8am
  cron.schedule('0 8 * * *', async () => {
    const { data: gameStartedRow } = await supabase
      .from('game_state').select('value').eq('key', 'game_started').single();

    if (gameStartedRow?.value !== 'true') return;

    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
    const event = SCHEDULE[dayOfWeek];
    if (!event) return;

    const { data: weekRow } = await supabase
      .from('game_state').select('value').eq('key', 'current_week').single();
    const week_number = parseInt(weekRow?.value) || 1;

    // Create game event record
    await supabase.from('game_events').insert({
      type: event.type,
      title: event.title,
      description: event.description,
      status: 'active',
      week_number,
      day_of_week: ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][dayOfWeek],
      scheduled_at: new Date().toISOString()
    });

    // Auto-actions per event type
    if (event.type === 'votacao') {
      await supabase.from('game_state').upsert(
        { key: 'votacao_active', value: 'true' },
        { onConflict: 'key' }
      );
    }

    if (io) {
      io.emit('scheduled_event', {
        type: event.type,
        title: event.title,
        description: event.description,
        week: week_number,
        day: dayOfWeek
      });

      io.emit('announcement', {
        id: Date.now().toString(),
        content: `🎬 ${event.title} começa agora! ${event.description}`,
        type: 'info',
        from: 'BBB Zap',
        created_at: new Date().toISOString()
      });
    }
  });

  // Saturday 10pm - close voting and form paredão
  cron.schedule('0 22 * * 4', async () => {
    const { data: gameStartedRow } = await supabase
      .from('game_state').select('value').eq('key', 'game_started').single();
    if (gameStartedRow?.value !== 'true') return;

    await supabase.from('game_state').upsert(
      { key: 'votacao_active', value: 'false' },
      { onConflict: 'key' }
    );

    if (io) io.emit('votacao_closed', { reason: 'automatic' });
  });

  // Sunday midnight - advance week
  cron.schedule('0 0 * * 0', async () => {
    const { data: gameStartedRow } = await supabase
      .from('game_state').select('value').eq('key', 'game_started').single();
    if (gameStartedRow?.value !== 'true') return;

    const { data: weekRow } = await supabase
      .from('game_state').select('value').eq('key', 'current_week').single();
    const currentWeek = parseInt(weekRow?.value) || 1;

    if (currentWeek >= 6) {
      if (io) io.emit('game_finale', { message: 'O BBB Zap chega à sua grande final!' });
      return;
    }

    await supabase.from('game_state').upsert([
      { key: 'current_week', value: String(currentWeek + 1) },
      { key: 'current_leader_id', value: 'null' },
      { key: 'current_angel_id', value: 'null' },
      { key: 'immune_user_id', value: 'null' },
      { key: 'paredao_users', value: '[]' },
      { key: 'sincerao_active', value: 'false' },
      { key: 'leader_indication', value: 'null' }
    ], { onConflict: 'key' });

    if (io) io.emit('new_week', { week: currentWeek + 1 });
  });

  console.log('[Scheduler] BBB Zap scheduler started');
};

module.exports = { start, setIO };
