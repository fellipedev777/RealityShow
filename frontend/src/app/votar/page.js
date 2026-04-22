'use client';

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Lock, Tv, Users } from 'lucide-react';
import api from '@/lib/api';

function getOrCreateToken() {
  const key = 'bbb_voter_token';
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export default function VotarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [votedFor, setVotedFor] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadParedao();

    // Check if already voted this week
    const savedVote = localStorage.getItem('bbb_public_voted_week');
    const savedName = localStorage.getItem('bbb_public_voted_name');
    if (savedVote && savedName) {
      setVoted(true);
      setVotedFor(savedName);
    }
  }, []);

  const loadParedao = async () => {
    try {
      const res = await api.get('/public/paredao');
      setData(res.data);
    } catch {
      setError('Erro ao carregar votação');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const token = getOrCreateToken();
      const res = await api.post('/public/vote', {
        voted_for_id: selected.id,
        voter_token: token
      });
      localStorage.setItem('bbb_public_voted_week', data.week);
      localStorage.setItem('bbb_public_voted_name', selected.name);
      setVoted(true);
      setVotedFor(selected.name);
      await loadParedao(); // reload with updated counts
    } catch (err) {
      if (err.response?.data?.error === 'already_voted') {
        setVoted(true);
        setError('Você já votou nesta semana!');
      } else {
        setError(err.response?.data?.error || 'Erro ao votar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-lg">
          <div className="w-8 h-8 bg-bbb-gold rounded-lg flex items-center justify-center">
            <Tv className="w-4 h-4 text-black" />
          </div>
          <span className="text-bbb-gold">BBB</span>
          <span className="text-white">Zap</span>
        </div>
        <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
          🗳️ Votação Pública
        </span>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">

          {loading && (
            <div className="card p-10 text-center">
              <div className="w-8 h-8 border-2 border-bbb-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Carregando votação...</p>
            </div>
          )}

          {!loading && (!data?.open) && (
            <div className="card p-10 text-center">
              <Lock className="w-14 h-14 text-gray-600 mx-auto mb-4" />
              <h1 className="text-xl font-black text-white mb-2">Votação Fechada</h1>
              <p className="text-gray-400 text-sm">
                A votação pública não está aberta no momento. Aguarde o administrador abrir!
              </p>
            </div>
          )}

          {!loading && data?.open && !voted && (
            <>
              {/* Title */}
              <div className="text-center">
                <h1 className="text-2xl font-black text-white mb-1">
                  Quem você quer <span className="text-red-400">eliminar</span>?
                </h1>
                <p className="text-gray-400 text-sm">Semana {data.week} · {data.totalVotes || 0} votos até agora</p>
              </div>

              {/* Participants */}
              {data.participants?.length === 0 ? (
                <div className="card p-8 text-center">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhum participante no paredão ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.participants.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setConfirming(false); }}
                      className={`w-full card p-4 flex items-center gap-4 transition-all border-2 ${
                        selected?.id === p.id
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-transparent hover:border-bbb-border'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-bbb-purple flex items-center justify-center text-xl font-black overflow-hidden shrink-0">
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                          : p.name?.[0]
                        }
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-white text-lg">{p.name}</p>
                        <div className="mt-1.5 h-2 bg-bbb-border rounded-full overflow-hidden w-full">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-700"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{p.votes} votos · {p.percentage}%</p>
                      </div>
                      {selected?.id === p.id && (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Confirm */}
              {selected && !confirming && (
                <button
                  onClick={() => setConfirming(true)}
                  className="btn-danger w-full py-4 text-base"
                >
                  Votar em {selected.name} →
                </button>
              )}

              {confirming && (
                <div className="card p-5 border-red-500/30 bg-red-500/5 space-y-4">
                  <p className="text-center text-sm text-gray-300">
                    Confirma seu voto em <strong className="text-white text-base">{selected.name}</strong>?
                    <br />
                    <span className="text-gray-500 text-xs">Este voto não pode ser alterado.</span>
                  </p>
                  {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirming(false)}
                      className="btn-outline flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleVote}
                      disabled={submitting}
                      className="btn-danger flex-1"
                    >
                      {submitting
                        ? <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Votando...
                          </span>
                        : '✓ Confirmar Voto'
                      }
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Voted screen */}
          {!loading && voted && (
            <div className="card p-10 text-center border-green-500/30 bg-green-500/5">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-white mb-2">Voto Registrado!</h1>
              <p className="text-gray-400">
                Você votou em <strong className="text-white">{votedFor}</strong>.
              </p>
              <p className="text-gray-500 text-sm mt-2">Obrigado por participar! 🎉</p>

              {/* Show live results after voting */}
              {data?.participants?.length > 0 && (
                <div className="mt-6 space-y-3 text-left">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider text-center mb-2">
                    Placar parcial — {data.totalVotes} votos
                  </p>
                  {[...data.participants].sort((a, b) => b.votes - a.votes).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                        {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-white">{p.name}</span>
                          <span className="text-gray-400">{p.percentage}%</span>
                        </div>
                        <div className="h-2 bg-bbb-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-700"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{p.votes} vt</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-gray-600 text-xs">BBB Zap · 1 voto por dispositivo por semana</p>
        </div>
      </div>
    </div>
  );
}
