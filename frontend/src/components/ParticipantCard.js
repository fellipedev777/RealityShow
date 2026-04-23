'use client';

import { useStore } from '@/lib/store';
import { Crown, Star, Shield, X } from 'lucide-react';
import Avatar from '@/components/Avatar';

export default function ParticipantCard({ participant, showRoom = false, compact = false, onSelect }) {
  const { gameState } = useStore();

  const isLeader = gameState?.current_leader_id === participant.id;
  const isAngel = gameState?.current_angel_id === participant.id;
  const isImmune = gameState?.immune_user_id === participant.id;

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(participant)}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left hover:border-bbb-purple ${
          participant.is_eliminated ? 'opacity-40 border-bbb-border' : 'border-bbb-border hover:bg-bbb-border/50'
        }`}
        disabled={participant.is_eliminated}
      >
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-bbb-purple flex items-center justify-center text-sm font-bold overflow-hidden">
            <Avatar src={participant.photo_url} name={participant.name} />
          </div>
          {isLeader && <Crown className="absolute -top-1 -right-1 w-4 h-4 text-bbb-gold" />}
          {isAngel && !isLeader && <Star className="absolute -top-1 -right-1 w-4 h-4 text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{participant.name}</p>
          {participant.is_eliminated && <p className="text-xs text-red-400">Eliminado</p>}
        </div>
        {isImmune && <Shield className="w-4 h-4 text-green-400 shrink-0" />}
      </button>
    );
  }

  return (
    <div
      onClick={() => onSelect?.(participant)}
      className={`card p-4 text-center transition-all cursor-pointer hover:border-bbb-purple ${
        participant.is_eliminated ? 'opacity-40' : ''
      } ${isLeader ? 'border-bbb-gold gold-glow' : ''}`}
    >
      <div className="relative inline-block mb-3">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold overflow-hidden ${
          isLeader ? 'ring-2 ring-bbb-gold' : isAngel ? 'ring-2 ring-blue-400' : 'ring-1 ring-bbb-border'
        }`}>
          <div className="w-full h-full bg-bbb-purple flex items-center justify-center rounded-2xl text-white text-xl font-bold">
            <Avatar src={participant.photo_url} name={participant.name} imgClass="w-full h-full object-cover rounded-2xl" />
          </div>
        </div>
        {isLeader && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-bbb-gold rounded-full flex items-center justify-center">
            <Crown className="w-3 h-3 text-black" />
          </div>
        )}
        {isAngel && !isLeader && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Star className="w-3 h-3 text-white" />
          </div>
        )}
        {participant.is_eliminated && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-white truncate">{participant.name}</p>

      <div className="flex flex-wrap gap-1 justify-center mt-2">
        {isLeader && <span className="badge bg-bbb-gold/20 text-bbb-gold">👑 Líder</span>}
        {isAngel && <span className="badge bg-blue-500/20 text-blue-400">⭐ Anjo</span>}
        {isImmune && <span className="badge bg-green-500/20 text-green-400">🛡️ Imune</span>}
        {participant.is_eliminated && <span className="badge bg-red-500/20 text-red-400">❌ Out</span>}
      </div>

      {showRoom && participant.room_participants?.[0]?.rooms && (
        <p className="text-xs text-gray-500 mt-1.5 truncate">
          {participant.room_participants[0].rooms.icon} {participant.room_participants[0].rooms.name}
        </p>
      )}
    </div>
  );
}
