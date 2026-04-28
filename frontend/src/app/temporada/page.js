'use client';

import { useEffect, useState } from 'react';
import { publicAPI } from '@/lib/api';
import { Users, Trophy, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function TemporadaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicAPI.landing()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gameStarted = data?.game_started === true || data?.game_started === 'true';
  const votingOpen = data?.public_voting_active === true || data?.public_voting_active === 'true';
  const week = parseInt(data?.current_week) || 1;
  const totalWeeks = parseInt(data?.total_weeks) || 10;
  const progress = Math.min(Math.round((week / totalWeeks) * 100), 100);

  return (
    <div className="min-h-screen gradient-bg px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-bbb-gold/30 border-t-bbb-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="card p-8 text-center border-bbb-gold/20">
              <div className="text-6xl mb-4">{data?.reality_emoji || '🏆'}</div>
              <h1 className="text-3xl font-black text-white mb-2">
                {data?.reality_name || 'LiveReality'}
              </h1>
              <p className="text-gray-400 mb-4">
                {data?.reality_description || 'Reality Show Online em Tempo Real'}
              </p>
              <span className={`badge text-sm px-3 py-1 ${gameStarted ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                {gameStarted ? '🔴 Ao vivo' : '⏳ Em breve'}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 text-center">
                <Users className="w-6 h-6 text-bbb-gold mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{data?.active_participants ?? '—'}</p>
                <p className="text-xs text-gray-500">participantes ativos</p>
              </div>
              <div className="card p-4 text-center">
                <Calendar className="w-6 h-6 text-bbb-purple mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{gameStarted ? `${week}/${totalWeeks}` : '—'}</p>
                <p className="text-xs text-gray-500">semana atual</p>
              </div>
            </div>

            {/* Progress */}
            {gameStarted && (
              <div className="card p-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Progresso da temporada</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-bbb-border rounded-full overflow-hidden">
                  <div className="h-full bg-bbb-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Public voting */}
            {votingOpen && (
              <Link href="/votar" className="card p-5 flex items-center gap-4 border-red-500/30 hover:border-red-500/60 transition-colors">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-2xl">🗳️</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">Votação aberta!</p>
                  <p className="text-sm text-gray-400">Clique para votar no paredão</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </Link>
            )}

            {/* Eliminated link */}
            <Link href="/eliminados" className="card p-4 flex items-center gap-3 hover:border-bbb-border/80 transition-colors">
              <Trophy className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300">Ver histórico de eliminados</span>
              <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
            </Link>

            {/* Register */}
            {!gameStarted && (
              <Link href="/" className="btn-gold w-full text-center">
                🏠 Entrar no Reality
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
