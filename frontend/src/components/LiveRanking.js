'use client';

import { Trophy, Medal } from 'lucide-react';
import Avatar from '@/components/Avatar';

const medals = ['🥇', '🥈', '🥉'];

export default function LiveRanking({ scores = [], provaTitle = 'Ranking Ao Vivo' }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-2">
        <Trophy className="w-4 h-4 text-bbb-gold" />
        <h3 className="font-semibold text-sm">{provaTitle}</h3>
        <span className="ml-auto badge bg-red-500/20 text-red-400 animate-pulse text-xs">AO VIVO</span>
      </div>
      <div className="divide-y divide-bbb-border/50">
        {scores.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Aguardando respostas...</p>
          </div>
        ) : (
          scores.map((entry, i) => (
            <div
              key={entry.user_id || i}
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                i === 0 ? 'bg-bbb-gold/5' : ''
              }`}
            >
              <span className="text-lg w-6 text-center shrink-0">
                {i < 3 ? medals[i] : `#${i + 1}`}
              </span>
              <div className="w-8 h-8 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                <Avatar src={entry.users?.photo_url} name={entry.users?.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {entry.users?.name || 'Participante'}
                </p>
                <p className="text-xs text-gray-500">{entry.correct_count}/{entry.answers_count} corretas</p>
              </div>
              <div className={`text-right shrink-0 ${i === 0 ? 'text-bbb-gold' : 'text-gray-300'}`}>
                <p className="text-base font-bold">{entry.score}</p>
                <p className="text-xs text-gray-500">pts</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
