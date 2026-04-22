'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ParticipantCard from '@/components/ParticipantCard';
import { useStore } from '@/lib/store';
import { sincerao as sinceracaoAPI, participantsAPI } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Mic2, Send, Lock, MessageCircle, Clock } from 'lucide-react';

export default function SinceracaoPage() {
  const router = useRouter();
  const { token, user, gameState, participants, setParticipants } = useStore();
  const [sinceracaoData, setSinceracaoData] = useState(null);
  const [comments, setComments] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isActive = gameState?.sincerao_active === true || gameState?.sincerao_active === 'true';
  const socket = getSocket();

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    loadData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('sincerao_new_comment', (c) => {
      setComments(prev => [c, ...prev]);
    });

    socket.on('sincerao_opened', (data) => {
      setSinceracaoData(d => ({ ...d, is_active: true, theme: data.theme }));
    });

    socket.on('sincerao_closed', () => {
      setSinceracaoData(d => d ? { ...d, is_active: false } : d);
    });

    return () => {
      socket.off('sincerao_new_comment');
      socket.off('sincerao_opened');
      socket.off('sincerao_closed');
    };
  }, [socket]);

  const loadData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        participantsAPI.active(),
        sinceracaoAPI.current()
      ]);
      setParticipants(pRes.data.participants || []);
      if (sRes.data.sincerao) {
        setSinceracaoData(sRes.data.sincerao);
        setComments((sRes.data.sincerao.sincerao_comments || []).reverse());
      }
    } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!selectedTarget || !comment.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      // Emit via socket for real-time
      socket?.emit('sincerao_comment', { target_id: selectedTarget.id, comment: comment.trim() });
      setComment('');
      setSelectedTarget(null);
    } catch (err) {
      setError('Erro ao enviar comentário');
    } finally {
      setLoading(false);
    }
  };

  const otherParticipants = participants.filter(p => p.id !== user?.id);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-6">
        {/* Header */}
        <div className={`card p-6 ${isActive ? 'border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-bbb-dark' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-pink-500/20' : 'bg-bbb-border'}`}>
              <Mic2 className={`w-6 h-6 ${isActive ? 'text-pink-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Sincerão</h1>
              {sinceracaoData?.theme && (
                <p className="text-sm text-pink-400 font-semibold">Tema: {sinceracaoData.theme}</p>
              )}
            </div>
            {isActive
              ? <span className="ml-auto badge bg-pink-500/20 text-pink-400 border border-pink-500/30 animate-pulse">🎤 Ao Vivo</span>
              : <span className="ml-auto badge bg-gray-500/20 text-gray-500">🔒 Fechado</span>
            }
          </div>
          <p className="text-sm text-gray-400">
            Hora da verdade! Compartilhe o que pensa sobre seus colegas de casa com total honestidade.
          </p>
        </div>

        {!isActive && !sinceracaoData && (
          <div className="card p-8 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Sincerão Fechado</h2>
            <p className="text-gray-400 text-sm">O Sincerão ocorre às quartas-feiras. Aguarde o administrador abrir o evento!</p>
          </div>
        )}

        {/* Comment form */}
        {isActive && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-bbb-border">
              <h2 className="font-semibold">Dizer a Verdade</h2>
              <p className="text-xs text-gray-500">Escolha para quem você quer falar</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Target selection */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Para quem:</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {otherParticipants.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedTarget(selectedTarget?.id === p.id ? null : p)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedTarget?.id === p.id
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-bbb-border hover:border-bbb-purple'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                        {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                      </div>
                      <span className="text-sm font-medium">{p.name}</span>
                      {selectedTarget?.id === p.id && <span className="ml-auto text-pink-400 text-xs">✓ Selecionado</span>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTarget && (
                <form onSubmit={handleComment}>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">
                    Sua mensagem para {selectedTarget.name}:
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Seja honesto(a)..."
                    maxLength={500}
                    rows={3}
                    className="input resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-600">{comment.length}/500</span>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                    <button type="submit" disabled={!comment.trim() || loading} className="btn-primary">
                      <Send className="w-4 h-4" />
                      Enviar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Live comments */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold">Comentários</h2>
            {isActive && <span className="ml-auto badge bg-red-500/20 text-red-400 animate-pulse text-xs">AO VIVO</span>}
          </div>
          <div className="divide-y divide-bbb-border/50 max-h-[500px] overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <Mic2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Seja o primeiro a falar!</p>
              </div>
            ) : (
              comments.map((c, i) => (
                <div key={c.id || i} className="p-4 animate-slide-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-white">{c.author_name}</span>
                    <span className="text-gray-500 text-xs">→</span>
                    <span className={`font-bold text-sm ${c.target_id === user?.id ? 'text-pink-400' : 'text-bbb-purple'}`}>
                      {c.target_name} {c.target_id === user?.id && '(você)'}
                    </span>
                    <span className="ml-auto text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${c.target_id === user?.id ? 'bg-pink-500/5 border border-pink-500/20 rounded-lg p-3' : 'text-gray-300'}`}>
                    {c.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
