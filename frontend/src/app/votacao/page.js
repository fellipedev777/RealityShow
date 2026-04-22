'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ParticipantCard from '@/components/ParticipantCard';
import { useStore } from '@/lib/store';
import { participantsAPI, votesAPI } from '@/lib/api';
import { Vote, CheckCircle, Lock, Shield } from 'lucide-react';

export default function VotacaoPage() {
  const router = useRouter();
  const { token, user, gameState, participants, setParticipants } = useStore();
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const votacaoActive = gameState?.votacao_active === true || gameState?.votacao_active === 'true';
  const immuneId = gameState?.immune_user_id;
  const leaderId = gameState?.current_leader_id;

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const [pRes, vRes] = await Promise.all([
        participantsAPI.active(),
        votesAPI.status()
      ]);
      setParticipants(pRes.data.participants || []);
      if (vRes.data.voted) {
        setVoted(true);
        setMyVote(vRes.data.vote);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setChecking(false);
    }
  };

  const handleVote = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError('');
    try {
      await votesAPI.cast({ voted_for_id: selected.id });
      setVoted(true);
      setMyVote({ voted_for_id: selected.id });
      setSuccess(`Voto registrado para ${selected.name}!`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao votar');
    } finally {
      setLoading(false);
    }
  };

  const votableParticipants = participants.filter(p =>
    p.id !== user?.id && p.id !== immuneId && p.id !== leaderId
  );

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
        {/* Header */}
        <div className={`card p-6 ${votacaoActive ? 'border-red-500/30 bg-red-500/5' : 'border-bbb-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${votacaoActive ? 'bg-red-500/20' : 'bg-bbb-border'}`}>
              <Vote className={`w-6 h-6 ${votacaoActive ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Votação da Semana</h1>
              <p className="text-sm text-gray-400">Semana {gameState?.current_week || 1}</p>
            </div>
            {votacaoActive
              ? <span className="ml-auto badge bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">🔴 Aberta</span>
              : <span className="ml-auto badge bg-gray-500/20 text-gray-500">🔒 Fechada</span>
            }
          </div>
          <p className="text-sm text-gray-400">
            Vote secretamente em quem deve ir ao paredão. Os mais votados enfrentarão a eliminação!
          </p>
        </div>

        {checking ? (
          <div className="text-center py-12 text-gray-500">Verificando votação...</div>
        ) : !votacaoActive ? (
          <div className="card p-8 text-center">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Votação Fechada</h2>
            <p className="text-gray-400 text-sm">A votação será aberta pelo administrador. Fique atento!</p>
          </div>
        ) : voted ? (
          <div className="card p-8 text-center border-green-500/30 bg-green-500/5">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Voto Registrado!</h2>
            <p className="text-gray-400 mb-4">Você já votou nesta semana. O resultado será revelado em breve.</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-bbb-dark rounded-xl border border-bbb-border">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">Voto secreto protegido</span>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-bbb-border">
              <h2 className="font-semibold">Escolha quem vai ao paredão</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Você não pode votar em si mesmo, no Líder ou no Imunizado
              </p>
            </div>

            {immuneId && (
              <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-sm text-green-400">
                <Shield className="w-4 h-4" />
                <span>
                  {participants.find(p => p.id === immuneId)?.name || 'Alguém'} está imunizado(a) e não pode ser votado.
                </span>
              </div>
            )}

            <div className="p-4 grid grid-cols-1 gap-2">
              {votableParticipants.map(p => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  compact
                  onSelect={() => setSelected(p)}
                />
              ))}
            </div>

            {selected && (
              <div className="px-4 pb-4">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-3">
                  <p className="text-sm text-red-300 text-center">
                    Você está prestes a votar em <strong className="text-white">{selected.name}</strong>.
                    Este voto é irreversível!
                  </p>
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center mb-3">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setSelected(null)} className="btn-outline flex-1">
                    Cancelar
                  </button>
                  <button onClick={handleVote} disabled={loading} className="btn-danger flex-1">
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Votando...
                      </span>
                    ) : (
                      `🗳️ Confirmar Voto em ${selected.name}`
                    )}
                  </button>
                </div>
              </div>
            )}

            {votableParticipants.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Não há participantes elegíveis para votação
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
