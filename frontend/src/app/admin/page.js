'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useStore } from '@/lib/store';
import { adminAPI, provasAPI, participantsAPI, publicAPI } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Settings, Play, Vote, Mic2, Shield, AlertTriangle,
  Crown, Star, Users, ChevronRight, Check, X, RefreshCw,
  Bell, Trophy, Zap, SkipForward, UserX, Globe, Copy, Link, Calendar
} from 'lucide-react';
import Avatar from '@/components/Avatar';

function ActionButton({ icon: Icon, label, color = 'btn-primary', onClick, loading, disabled, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${color} w-full justify-start gap-3 relative`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className={`badge text-xs ${badge.color}`}>{badge.text}</span>}
      {loading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin ml-auto" />}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { token, user, gameState, updateGameState, setGameState, participants, setParticipants } = useStore();
  const [loading, setLoading] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const [sinceracaoTheme, setSinceracaoTheme] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('');
  const [selectedAngel, setSelectedAngel] = useState('');
  const [selectedImmune, setSelectedImmune] = useState('');
  const [selectedEliminate, setSelectedEliminate] = useState('');
  const [eliminationSpeech, setEliminationSpeech] = useState('');
  const [selectedMoveUser, setSelectedMoveUser] = useState('');
  const [selectedMoveRoom, setSelectedMoveRoom] = useState('');
  const [provaType, setProvaType] = useState('lider');
  const [feedback, setFeedback] = useState('');
  const [voteResults, setVoteResults] = useState(null);
  const [publicResults, setPublicResults] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [totalWeeks, setTotalWeeks] = useState('');
  const socket = getSocket();

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    if (!user?.is_admin) { router.push('/dashboard'); return; }
    participantsAPI.list().then(r => setParticipants(r.data.participants)).catch(() => {});
  }, [token, user]);

  useEffect(() => {
    if (gameState?.total_weeks) setTotalWeeks(String(gameState.total_weeks));
  }, [gameState?.total_weeks]);

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));
  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); };

  const action = async (key, fn, successMsg) => {
    setLoad(key, true);
    try {
      const res = await fn();
      showFeedback(successMsg || 'Feito!');
      return res;
    } catch (err) {
      showFeedback(`Erro: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoad(key, false);
    }
  };

  const emit = (event, data) => {
    socket?.emit('admin_event', { event, data });
  };

  const handleStartGame = () => action('start', () => adminAPI.startGame(), '🎬 Jogo iniciado!');

  const handleOpenSincerao = async () => {
    await action('sincerao', () => adminAPI.openSincerao(sinceracaoTheme), '🎤 Sincerão aberto!');
    emit('open_sincerao', { theme: sinceracaoTheme });
    updateGameState('sincerao_active', true);
  };

  const handleCloseSincerao = async () => {
    await action('sincerao_close', () => adminAPI.closeSincerao(), '🔒 Sincerão fechado!');
    emit('close_sincerao', {});
    updateGameState('sincerao_active', false);
  };

  const handleOpenVotacao = async () => {
    await action('votacao', () => adminAPI.openVotacao(), '🗳️ Votação aberta!');
    emit('open_votacao', { week: gameState?.current_week });
    updateGameState('votacao_active', true);
  };

  const handleCloseVotacao = async () => {
    const res = await action('votacao_close', () => adminAPI.closeVotacao(), '🔒 Votação encerrada!');
    emit('close_votacao', {});
    updateGameState('votacao_active', false);
    if (res?.data?.paredao) {
      emit('paredao_formed', { participants: res.data.paredao });
    }
  };

  const handleSetLeader = async () => {
    if (!selectedLeader) return;
    await action('leader', () => adminAPI.updateState('current_leader_id', selectedLeader), '👑 Líder definido!');
    const p = participants.find(p => p.id === selectedLeader);
    emit('set_leader', { user_id: selectedLeader, name: p?.name });
    updateGameState('current_leader_id', selectedLeader);
  };

  const handleClearLeader = async () => {
    await action('leader_clear', () => adminAPI.updateState('current_leader_id', null), '👑 Líder removido!');
    updateGameState('current_leader_id', null);
    setSelectedLeader('');
  };

  const handleSetAngel = async () => {
    if (!selectedAngel) return;
    await action('angel', () => adminAPI.updateState('current_angel_id', selectedAngel), '⭐ Anjo definido!');
    const p = participants.find(p => p.id === selectedAngel);
    emit('set_angel', { user_id: selectedAngel, name: p?.name });
    updateGameState('current_angel_id', selectedAngel);
  };

  const handleClearAngel = async () => {
    await action('angel_clear', () => adminAPI.updateState('current_angel_id', null), '⭐ Anjo removido!');
    updateGameState('current_angel_id', null);
    setSelectedAngel('');
  };

  const handleSetImmune = async () => {
    if (!selectedImmune) return;
    await action('immune', () => adminAPI.updateState('immune_user_id', selectedImmune), '🛡️ Imunidade concedida!');
    updateGameState('immune_user_id', selectedImmune);
  };

  const handleClearImmune = async () => {
    await action('immune_clear', () => adminAPI.updateState('immune_user_id', null), '🛡️ Imunidade removida!');
    updateGameState('immune_user_id', null);
    setSelectedImmune('');
  };

  const handleEliminate = async () => {
    if (!selectedEliminate) return;
    if (!confirm('Confirmar eliminação? Esta ação é irreversível!')) return;
    const res = await action('eliminate', () => adminAPI.eliminate(selectedEliminate, eliminationSpeech.trim() || null), '❌ Participante eliminado!');
    if (res?.data) {
      const { speech, eliminated } = res.data;
      emit('elimination', { user_id: selectedEliminate, name: eliminated, speech });
      setSelectedEliminate('');
      setEliminationSpeech('');
    }
  };

  const handleCreateProva = async () => {
    const titles = { lider: 'Prova do Líder', anjo: 'Prova do Anjo', bate_volta: 'Bate e Volta' };
    const res = await action('prova', () => provasAPI.create({ type: provaType, title: titles[provaType] }), '🎯 Prova criada!');
    if (res?.data?.prova) {
      socket?.emit('admin_start_prova', { prova_id: res.data.prova.id });
      showFeedback('🚀 Prova iniciada ao vivo!');
    }
  };

  const handleAnnouncement = () => {
    if (!announcement.trim()) return;
    socket?.emit('admin_announcement', { content: announcement, type: 'info' });
    setAnnouncement('');
    showFeedback('📢 Aviso enviado para todos!');
  };

  const handleLoadVoteResults = async () => {
    const res = await action('results', () => import('@/lib/api').then(m => m.votesAPI.results()), '');
    if (res?.data) setVoteResults(res.data);
  };

  const handleOpenPublicVoting = async () => {
    await action('pub_voting', () => adminAPI.openPublicVoting(), '🌍 Votação pública aberta!');
    updateGameState('public_voting_active', true);
  };

  const handleClosePublicVoting = async () => {
    await action('pub_voting_close', () => adminAPI.closePublicVoting(), '🔒 Votação pública fechada!');
    updateGameState('public_voting_active', false);
  };

  const handleLoadPublicResults = async () => {
    const res = await action('pub_results', () => publicAPI.results(), '');
    if (res?.data) setPublicResults(res.data);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/votar`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSetTotalWeeks = async () => {
    const n = parseInt(totalWeeks);
    if (!n || n < 1) return;
    await action('total_weeks', () => adminAPI.updateState('total_weeks', String(n)), `📅 Duração definida: ${n} semanas!`);
    updateGameState('total_weeks', n);
  };

  const handleResetGame = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai resetar TODO o reality.\n\nVotos, paredões, provas e eliminações serão apagados.\nOs participantes cadastrados serão mantidos.\n\nTem certeza?')) return;
    if (!confirm('Confirmar RESET COMPLETO do reality?')) return;
    const res = await action('reset', () => adminAPI.resetGame(), '🔄 Reality resetado! Clique em Iniciar para começar.');
    if (res?.data?.success) {
      setGameState({
        game_started: 'false',
        current_week: '1',
        current_leader_id: 'null',
        current_angel_id: 'null',
        immune_user_id: 'null',
        paredao_users: '[]',
        votacao_active: 'false',
        sincerao_active: 'false',
        public_voting_active: 'false',
        total_weeks: gameState?.total_weeks || '10',
      });
      participantsAPI.list().then(r => setParticipants(r.data.participants)).catch(() => {});
    }
  };

  const handleNextWeek = async () => {
    if (!confirm('Avançar para próxima semana?')) return;
    const res = await action('next_week', () => adminAPI.nextWeek(), '📅 Nova semana iniciada!');
    if (res) emit('next_week', { week: res.data?.new_week });
  };

  const activeParticipants = participants.filter(p => !p.is_admin && !p.is_eliminated && p.is_active);

  const publicVotingActive = gameState?.public_voting_active === true || gameState?.public_voting_active === 'true';
  const sinceracaoActive = gameState?.sincerao_active === true || gameState?.sincerao_active === 'true';
  const votacaoActive = gameState?.votacao_active === true || gameState?.votacao_active === 'true';
  const gameStarted = gameState?.game_started === true || gameState?.game_started === 'true';

  return (
    <AppShell>
      <div className="space-y-6 pb-20 lg:pb-6">
        {/* Header */}
        <div className="card p-5 bg-gradient-to-r from-bbb-purple/20 to-bbb-dark border-bbb-purple/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bbb-purple/30 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-bbb-purple" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Painel do Administrador</h1>
              <p className="text-sm text-gray-400">Controle total do LiveReality · Semana {gameState?.current_week || 1}</p>
            </div>
          </div>
          {feedback && (
            <div className="mt-3 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl animate-slide-in">
              {feedback}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Column 1 - Game control */}
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-green-400" /> Controle do Jogo
              </h2>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Duração do jogo
                  {gameState?.total_weeks && <span className="ml-2 text-bbb-gold">· atual: {gameState.total_weeks} semanas</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={totalWeeks}
                    onChange={e => setTotalWeeks(e.target.value)}
                    placeholder="Ex: 10"
                    className="input flex-1"
                  />
                  <button onClick={handleSetTotalWeeks} disabled={!totalWeeks} className="btn-gold px-3">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!gameStarted && (
                <ActionButton icon={Play} label="🎬 Iniciar LiveReality" color="btn-gold" onClick={handleStartGame} loading={loading.start} />
              )}

              {gameStarted && (
                <ActionButton icon={SkipForward} label="📅 Avançar Semana" color="btn-outline" onClick={handleNextWeek} loading={loading.next_week} />
              )}
            </div>

            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-bbb-gold" /> Provas
              </h2>
              <select value={provaType} onChange={e => setProvaType(e.target.value)} className="input">
                <option value="lider">👑 Prova do Líder</option>
                <option value="anjo">⭐ Prova do Anjo</option>
                <option value="bate_volta">⚡ Bate e Volta</option>
              </select>
              <ActionButton icon={Zap} label="🚀 Criar e Iniciar Prova" color="btn-gold" onClick={handleCreateProva} loading={loading.prova} />
            </div>

            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Vote className="w-4 h-4 text-red-400" /> Votação
              </h2>
              <ActionButton
                icon={Vote} label="Abrir Votação" color="btn-primary" onClick={handleOpenVotacao}
                loading={loading.votacao} disabled={votacaoActive}
                badge={votacaoActive ? { text: 'Aberta', color: 'bg-green-500/20 text-green-400' } : null}
              />
              <ActionButton
                icon={X} label="Fechar e Formar Paredão" color="btn-danger" onClick={handleCloseVotacao}
                loading={loading.votacao_close} disabled={!votacaoActive}
              />
              <ActionButton icon={RefreshCw} label="Ver Resultados" color="btn-outline" onClick={handleLoadVoteResults} loading={loading.results} />
              {voteResults && (
                <div className="bg-bbb-dark rounded-xl p-3 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">Votos da Semana {voteResults.week_number}:</p>
                  {voteResults.results?.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{r.user?.name}</span>
                      <span className="font-bold text-white">{r.count} votos</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-600">Total: {voteResults.total} votos</p>
                </div>
              )}
            </div>

            {/* Public voting card */}
            <div className="card p-4 space-y-3 border-blue-500/20">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Votação Pública
              </h2>
              <ActionButton
                icon={Globe} label="Abrir para o Público" color="btn-primary" onClick={handleOpenPublicVoting}
                loading={loading.pub_voting} disabled={publicVotingActive}
                badge={publicVotingActive ? { text: 'Aberta', color: 'bg-blue-500/20 text-blue-400' } : null}
              />
              <ActionButton
                icon={X} label="Fechar Votação Pública" color="btn-danger" onClick={handleClosePublicVoting}
                loading={loading.pub_voting_close} disabled={!publicVotingActive}
              />
              <ActionButton
                icon={RefreshCw} label="Ver Placar Público" color="btn-outline" onClick={handleLoadPublicResults}
                loading={loading.pub_results}
              />
              <button
                onClick={handleCopyLink}
                className="btn-outline w-full justify-start gap-3 text-blue-400 border-blue-500/30"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Link copiado!' : 'Copiar link /votar'}
              </button>
              {publicResults && (
                <div className="bg-bbb-dark rounded-xl p-3 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">Placar público — {publicResults.total} votos:</p>
                  {publicResults.results?.map((r, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{r.user?.name}</span>
                        <span className="font-bold text-white">{r.count} · {r.percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-bbb-border rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2 - Events */}
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-pink-400" /> Sincerão
              </h2>
              <input
                value={sinceracaoTheme}
                onChange={e => setSinceracaoTheme(e.target.value)}
                placeholder="Tema do Sincerão..."
                className="input"
              />
              <ActionButton
                icon={Mic2} label="🎤 Abrir Sincerão" color="btn-primary" onClick={handleOpenSincerao}
                loading={loading.sincerao} disabled={sinceracaoActive}
                badge={sinceracaoActive ? { text: 'Ativo', color: 'bg-pink-500/20 text-pink-400' } : null}
              />
              <ActionButton
                icon={X} label="Fechar Sincerão" color="btn-danger" onClick={handleCloseSincerao}
                loading={loading.sincerao_close} disabled={!sinceracaoActive}
              />
            </div>

            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Crown className="w-4 h-4 text-bbb-gold" /> Líder & Anjo
              </h2>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Definir Líder
                  {gameState?.current_leader_id && gameState.current_leader_id !== 'null' && (
                    <span className="ml-2 text-bbb-gold">
                      · atual: {participants.find(p => p.id === gameState.current_leader_id)?.name || '?'}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <select value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)} className="input flex-1">
                    <option value="">Selecione...</option>
                    {activeParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={handleSetLeader} disabled={!selectedLeader} className="btn-gold px-3">
                    <Crown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearLeader}
                    disabled={!gameState?.current_leader_id || gameState.current_leader_id === 'null'}
                    title="Remover líder"
                    className="btn-danger px-3"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Definir Anjo
                  {gameState?.current_angel_id && gameState.current_angel_id !== 'null' && (
                    <span className="ml-2 text-blue-400">
                      · atual: {participants.find(p => p.id === gameState.current_angel_id)?.name || '?'}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <select value={selectedAngel} onChange={e => setSelectedAngel(e.target.value)} className="input flex-1">
                    <option value="">Selecione...</option>
                    {activeParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={handleSetAngel} disabled={!selectedAngel} className="btn-primary px-3">
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearAngel}
                    disabled={!gameState?.current_angel_id || gameState.current_angel_id === 'null'}
                    title="Remover anjo"
                    className="btn-danger px-3"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Conceder Imunidade
                  {gameState?.immune_user_id && gameState.immune_user_id !== 'null' && (
                    <span className="ml-2 text-green-400">
                      · atual: {participants.find(p => p.id === gameState.immune_user_id)?.name || '?'}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <select value={selectedImmune} onChange={e => setSelectedImmune(e.target.value)} className="input flex-1">
                    <option value="">Selecione...</option>
                    {activeParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={handleSetImmune} disabled={!selectedImmune} className="btn-outline px-3">
                    <Shield className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearImmune}
                    disabled={!gameState?.immune_user_id || gameState.immune_user_id === 'null'}
                    title="Remover imunidade"
                    className="btn-danger px-3"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" /> Aviso Global
              </h2>
              <textarea
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder="Mensagem para todos os participantes..."
                rows={3}
                className="input resize-none"
              />
              <ActionButton icon={Bell} label="📢 Enviar para Todos" color="btn-primary" onClick={handleAnnouncement} disabled={!announcement.trim()} />
            </div>
          </div>

          {/* Column 3 - Participants */}
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h2 className="font-bold text-sm">Participantes ({activeParticipants.length})</h2>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-bbb-border/50">
                {participants.filter(p => !p.is_admin).map(p => (
                  <div key={p.id} className={`flex items-center gap-2 px-4 py-2.5 ${p.is_eliminated ? 'opacity-40' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                      <Avatar src={p.photo_url} name={p.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.id === gameState?.current_leader_id && <Crown className="w-3 h-3 text-bbb-gold" />}
                      {p.id === gameState?.current_angel_id && <Star className="w-3 h-3 text-blue-400" />}
                      {p.is_eliminated && <span className="text-xs text-red-400">Out</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Eliminate */}
            <div className="card p-4 space-y-3 border-red-500/20">
              <h2 className="font-bold text-sm text-red-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Eliminação
              </h2>
              <select value={selectedEliminate} onChange={e => setSelectedEliminate(e.target.value)} className="input">
                <option value="">Selecionar participante...</option>
                {activeParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Discurso de eliminação <span className="text-gray-600">(opcional — deixe vazio para gerar automaticamente)</span></label>
                <textarea
                  value={eliminationSpeech}
                  onChange={e => setEliminationSpeech(e.target.value)}
                  placeholder={selectedEliminate ? `Escreva o discurso para ${activeParticipants.find(p => p.id === selectedEliminate)?.name || ''}...` : 'Selecione um participante primeiro...'}
                  rows={3}
                  maxLength={400}
                  disabled={!selectedEliminate}
                  className="input resize-none text-sm"
                />
                {eliminationSpeech && (
                  <p className="text-xs text-gray-600 mt-1 text-right">{eliminationSpeech.length}/400</p>
                )}
              </div>
              <button
                onClick={handleEliminate}
                disabled={!selectedEliminate || loading.eliminate}
                className="btn-danger w-full justify-start gap-3"
              >
                <UserX className="w-4 h-4" />
                ❌ Eliminar Participante
              </button>
            </div>

            {/* Game state summary */}
            <div className="card p-4">
              <h2 className="font-bold text-sm text-gray-300 mb-3 uppercase tracking-wider">Estado do Jogo</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Semana', value: `${gameState?.current_week || 1} / ${gameState?.total_weeks || '?'}` },
                  { label: 'Jogo Iniciado', value: gameStarted ? '✅ Sim' : '❌ Não' },
                  { label: 'Votação', value: votacaoActive ? '🟢 Aberta' : '🔴 Fechada' },
                  { label: 'Sincerão', value: sinceracaoActive ? '🟢 Ativo' : '🔴 Fechado' },
                  { label: 'Votação Pública', value: publicVotingActive ? '🟢 Aberta' : '🔴 Fechada' },
                  { label: 'Participantes', value: `${activeParticipants.length} em jogo` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Reset */}
        <div className="card p-5 border-red-900/40 bg-red-950/10 mt-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-red-400 flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" /> Resetar Reality
              </h2>
              <p className="text-xs text-gray-500">
                Apaga votos, paredões, provas e eliminações. Mantém os participantes cadastrados e começa uma nova temporada do zero.
              </p>
            </div>
            <button
              onClick={handleResetGame}
              disabled={loading.reset}
              className="btn-danger shrink-0 flex items-center gap-2"
            >
              {loading.reset
                ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              Resetar Tudo
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
