'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useStore } from '@/lib/store';
import { participantsAPI } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Shield, X, AlertTriangle, Flame } from 'lucide-react';
import Avatar from '@/components/Avatar';

export default function ParedaoPage() {
  const router = useRouter();
  const { token, user, gameState, participants, setParticipants } = useStore();
  const [eliminated, setEliminated] = useState(null);
  const [speech, setSpeech] = useState('');
  const [eliminating, setEliminating] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    participantsAPI.active().then(r => setParticipants(r.data.participants)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('participant_eliminated', (data) => {
      setEliminated(data);
      setSpeech(data.speech || '');
      setEliminating(false);
    });
    return () => socket.off('participant_eliminated');
  }, [socket]);

  const paredaoIds = Array.isArray(gameState?.paredao_users) ? gameState.paredao_users : [];
  const paredaoParticipants = participants.filter(p => paredaoIds.includes(p.id));
  const hasParedao = paredaoIds.length > 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
        {/* Header */}
        <div className={`card p-6 ${hasParedao ? 'border-red-500/40 bg-gradient-to-br from-red-950/20 to-bbb-dark spotlight' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasParedao ? 'bg-red-500/20' : 'bg-bbb-border'}`}>
              <Shield className={`w-6 h-6 ${hasParedao ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Paredão</h1>
              <p className="text-sm text-gray-400">Semana {gameState?.current_week || 1}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Os participantes com mais votos enfrentarão o paredão e correm risco de eliminação.
          </p>
        </div>

        {/* Eliminated announcement */}
        {eliminated && (
          <div className="card p-8 text-center border-red-500/50 bg-red-950/20 animate-fade-in">
            <div className="text-5xl mb-4">😢</div>
            <h2 className="text-2xl font-black text-red-400 mb-3">
              {eliminated.name} foi eliminado(a)!
            </h2>
            <div className="p-4 bg-bbb-dark rounded-xl border border-bbb-border text-gray-300 text-sm leading-relaxed italic">
              "{speech}"
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasParedao && !eliminated && (
          <div className="card p-10 text-center">
            <Shield className="w-14 h-14 text-gray-700 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Nenhum Paredão Formado</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              O paredão é formado após a votação. Os mais votados aparecerão aqui.
            </p>
            <div className="mt-6 p-4 bg-bbb-dark rounded-xl border border-bbb-border text-left space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Como funciona:</p>
              <div className="space-y-1.5 text-sm text-gray-400">
                <p>🗳️ Participantes mais votados vão ao paredão</p>
                <p>👑 O Líder pode indicar alguém diretamente</p>
                <p>⭐ O Anjo imuniza um participante</p>
                <p>⚡ Bate e Volta pode salvar alguém do paredão</p>
                <p>❌ No sábado, o mais votado é eliminado</p>
              </div>
            </div>
          </div>
        )}

        {/* Paredão participants */}
        {hasParedao && !eliminated && (
          <>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-semibold mb-2">
                <Flame className="w-4 h-4" /> {paredaoParticipants.length} no Paredão
              </div>
              <p className="text-gray-500 text-xs">O público decide quem sai no sábado</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {paredaoParticipants.map((p) => (
                <div key={p.id} className="card p-6 text-center border-red-500/30 bg-red-950/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-red-950/30 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-3 overflow-hidden ring-2 ring-red-500/50 bg-red-500/20 flex items-center justify-center text-2xl font-black text-red-300">
                      <Avatar src={p.photo_url} name={p.name} imgClass="w-full h-full object-cover" />
                    </div>
                    <p className="font-bold text-white text-sm">{p.name}</p>
                    <div className="mt-2">
                      <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">
                        ⚠️ Em risco
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-4 flex items-center gap-3 border-yellow-500/20 bg-yellow-500/5">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-sm text-gray-300">
                A eliminação ocorre no sábado. O bate e volta ainda pode acontecer antes!
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
