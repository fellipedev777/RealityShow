'use client';

import { useEffect, useState } from 'react';
import { publicAPI } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/Avatar';

export default function EliminadosPage() {
  const [eliminated, setEliminated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicAPI.eliminated()
      .then(r => setEliminated(r.data.eliminated || []))
      .catch(() => setEliminated([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen gradient-bg px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/temporada" className="p-2 rounded-xl hover:bg-bbb-border transition-colors text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Eliminados</h1>
            <p className="text-sm text-gray-500">Histórico da temporada</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-bbb-gold/30 border-t-bbb-gold rounded-full animate-spin" />
          </div>
        ) : eliminated.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">🏠</div>
            <p className="text-gray-400">Ninguém foi eliminado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eliminated.map((p, i) => (
              <div key={p.id} className="card p-4 flex items-center gap-4">
                <div className="w-8 text-center shrink-0">
                  <span className="text-lg">{i === 0 ? '❌' : '💔'}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-bbb-purple/30 flex items-center justify-center text-lg overflow-hidden shrink-0 opacity-60">
                  <Avatar src={p.photo_url} name={p.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.week && <span className="text-xs text-gray-500">Semana {p.week}</span>}
                    {p.votes > 0 && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-red-400">{p.votes} {p.votes === 1 ? 'voto' : 'votos'}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="badge bg-red-500/10 text-red-400 border border-red-500/20 text-xs shrink-0">
                  Eliminado
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
