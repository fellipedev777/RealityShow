'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ParticipantCard from '@/components/ParticipantCard';
import { useStore } from '@/lib/store';
import { participantsAPI } from '@/lib/api';
import { Trophy, Vote, Mic2, Shield, Home, Calendar, Crown, Star, Users, Zap } from 'lucide-react';

const WEEK_SCHEDULE = [
  { day: 'Segunda', type: 'prova_lider', icon: '👑', label: 'Prova do Líder', color: 'text-yellow-400' },
  { day: 'Terça',   type: 'prova_anjo',  icon: '⭐', label: 'Prova do Anjo',  color: 'text-blue-400' },
  { day: 'Quarta',  type: 'sincerao',    icon: '🎤', label: 'Sincerão',        color: 'text-pink-400' },
  { day: 'Quinta',  type: 'votacao',     icon: '🗳️', label: 'Votação',         color: 'text-red-400' },
  { day: 'Sexta',   type: 'bate_volta',  icon: '⚡', label: 'Bate e Volta',    color: 'text-orange-400' },
  { day: 'Sábado',  type: 'eliminacao',  icon: '❌', label: 'Eliminação',      color: 'text-red-600' },
  { day: 'Domingo', type: 'convivencia', icon: '🌟', label: 'Convivência',     color: 'text-green-400' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, participants, setParticipants, gameState } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    participantsAPI.active()
      .then(r => setParticipants(r.data.participants))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const week = gameState?.current_week || 1;
  const today = new Date().getDay();
  const todaySchedule = WEEK_SCHEDULE[today === 0 ? 6 : today - 1];
  const leader = participants.find(p => p.id === gameState?.current_leader_id);
  const angel = participants.find(p => p.id === gameState?.current_angel_id);
  const votacaoActive = gameState?.votacao_active === true || gameState?.votacao_active === 'true';
  const sinceracaoActive = gameState?.sincerao_active === true || gameState?.sincerao_active === 'true';

  return (
    <AppShell>
      <div className="space-y-6 pb-20 lg:pb-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden card p-6 bg-gradient-to-br from-bbb-purple/20 to-bbb-dark border-bbb-purple/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-bbb-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">
                  Bem-vindo, {user?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-gray-400 mt-1">
                  Semana <strong className="text-bbb-gold">{week}</strong> · BBB Zap ao vivo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-green-500/20 text-green-400 border border-green-500/30">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online
                </span>
              </div>
            </div>

            {/* Today's event */}
            {todaySchedule && (
              <div className="mt-4 p-4 bg-bbb-dark/60 rounded-xl border border-bbb-border flex items-center gap-3">
                <span className="text-2xl">{todaySchedule.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">Hoje é {todaySchedule.day}</p>
                  <p className={`font-bold ${todaySchedule.color}`}>{todaySchedule.label}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/prova', icon: Trophy, label: 'Provas', color: 'bg-bbb-gold/10 border-bbb-gold/30 hover:bg-bbb-gold/20', textColor: 'text-bbb-gold' },
            { href: '/votacao', icon: Vote, label: 'Votação', badge: votacaoActive ? '🔴 Aberta' : null, color: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20', textColor: 'text-red-400' },
            { href: '/sincerao', icon: Mic2, label: 'Sincerão', badge: sinceracaoActive ? '🔴 Ao Vivo' : null, color: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20', textColor: 'text-pink-400' },
            { href: '/paredao', icon: Shield, label: 'Paredão', color: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20', textColor: 'text-orange-400' },
          ].map(({ href, icon: Icon, label, badge, color, textColor }) => (
            <Link
              key={href}
              href={href}
              className={`card border ${color} p-4 flex flex-col items-center gap-2 text-center transition-all active:scale-95`}
            >
              <Icon className={`w-6 h-6 ${textColor}`} />
              <span className={`font-semibold text-sm ${textColor}`}>{label}</span>
              {badge && <span className="text-xs text-white/70 animate-pulse">{badge}</span>}
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Participants */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold">Participantes na Casa</h2>
              <span className="ml-auto text-sm text-gray-500">{participants.length} no jogo</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {participants.map(p => (
                  <ParticipantCard key={p.id} participant={p} showRoom />
                ))}
                {participants.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    Nenhum participante ainda
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Current leaders */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-bbb-border">
                <h3 className="font-semibold text-sm">Destaques da Semana</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-bbb-gold/20 rounded-xl flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-bbb-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Líder da Semana</p>
                    <p className="font-semibold text-sm text-white truncate">{leader?.name || 'Não definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Anjo da Semana</p>
                    <p className="font-semibold text-sm text-white truncate">{angel?.name || 'Não definido'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly schedule */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-sm">Cronograma Semanal</h3>
              </div>
              <div className="divide-y divide-bbb-border/50">
                {WEEK_SCHEDULE.map((s, i) => {
                  const isToday = (today === 0 ? 6 : today - 1) === i;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isToday ? 'bg-bbb-purple/10' : ''}`}>
                      <span className="text-base">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`${isToday ? 'font-semibold text-white' : 'text-gray-400'} text-xs`}>{s.day}</span>
                        <p className={`${s.color} text-xs font-medium`}>{s.label}</p>
                      </div>
                      {isToday && <span className="badge bg-bbb-purple/30 text-bbb-purple text-xs">Hoje</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rooms */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-sm">Quartos</h3>
              </div>
              <div className="p-2">
                {[
                  { slug: 'sala-principal', label: 'Sala Principal', icon: '🏠' },
                  { slug: 'quarto-lider', label: 'Quarto Líder', icon: '👑' },
                  { slug: 'quarto-azul', label: 'Quarto Azul', icon: '💙' },
                  { slug: 'quarto-rosa', label: 'Quarto Rosa', icon: '🌸' },
                  { slug: 'quarto-verde', label: 'Quarto Verde', icon: '💚' },
                ].map(r => (
                  <Link
                    key={r.slug}
                    href={`/room/${r.slug}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bbb-border transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
