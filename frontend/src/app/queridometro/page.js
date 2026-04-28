'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { queridometroAPI, participantsAPI } from '@/lib/api';
import { Heart, Lock, Clock } from 'lucide-react';

const RATINGS = [
  { emoji: '❤️', value: 4, label: 'Amo' },
  { emoji: '😊', value: 3, label: 'Gosto' },
  { emoji: '😐', value: 2, label: 'Normal' },
  { emoji: '😤', value: 1, label: 'Não gosto' },
];

const AVG_EMOJI = (avg) => {
  if (avg >= 3.5) return '❤️';
  if (avg >= 2.5) return '😊';
  if (avg >= 1.5) return '😐';
  return '😤';
};

// 19h BRT = 22h UTC
const isResultsUnlocked = () => {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  return h > 22 || (h === 22 && m >= 0);
};

const getCountdown = () => {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(22, 0, 0, 0);
  if (now >= target) return null;
  const diff = target - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

export default function QueridometroPage() {
  const router = useRouter();
  const { token, user, participants, setParticipants } = useStore();
  const [myRatings, setMyRatings] = useState({});
  const [ratedToday, setRatedToday] = useState([]);
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('votar');
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(isResultsUnlocked());
  const [countdown, setCountdown] = useState(getCountdown());

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    Promise.all([
      participantsAPI.active(),
      queridometroAPI.myRatings(),
      queridometroAPI.results(),
    ]).then(([pRes, mRes, rRes]) => {
      setParticipants(pRes.data.participants || []);
      setMyRatings(mRes.data.myRatings || {});
      setRatedToday(mRes.data.ratedToday || []);
      setResults(rRes.data.results || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  // Countdown ticker
  useEffect(() => {
    if (unlocked) return;
    const timer = setInterval(() => {
      const cd = getCountdown();
      setCountdown(cd);
      if (!cd) {
        setUnlocked(true);
        clearInterval(timer);
        // Load results when unlocked
        queridometroAPI.results().then(r => setResults(r.data.results || [])).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [unlocked]);

  const handleRate = async (rated_id, emoji) => {
    if (ratedToday.includes(rated_id)) return;
    setSaving(rated_id);
    try {
      await queridometroAPI.rate(rated_id, emoji);
      setMyRatings(r => ({ ...r, [rated_id]: emoji }));
      setRatedToday(r => [...r, rated_id]);
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg) alert(msg);
    }
    setSaving(null);
  };

  const others = participants.filter(p => p.id !== user?.id);
  const rated = Object.keys(myRatings).length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-5 pb-20 lg:pb-6">
        {/* Header */}
        <div className="card p-5 bg-gradient-to-br from-pink-500/10 to-bbb-dark border-pink-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black text-white">Queridômetro</h1>
              <p className="text-sm text-gray-400">Como você se sente em relação aos outros participantes?</p>
            </div>
            <span className="badge bg-pink-500/20 text-pink-400 border border-pink-500/30">
              {rated}/{others.length} avaliados
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-bbb-dark rounded-xl p-1">
          <button onClick={() => setTab('votar')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'votar' ? 'bg-bbb-purple text-white' : 'text-gray-400 hover:text-white'}`}>
            ❤️ Avaliar
          </button>
          <button onClick={() => setTab('resultado')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'resultado' ? 'bg-bbb-purple text-white' : 'text-gray-400 hover:text-white'}`}>
            📊 Resultado
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : tab === 'votar' ? (
          <div className="space-y-3">
            {others.map(p => {
              const alreadyToday = ratedToday.includes(p.id);
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-bbb-purple/30 flex items-center justify-center text-lg overflow-hidden shrink-0">
                      <Avatar src={p.photo_url} name={p.name} />
                    </div>
                    <p className="font-semibold text-white flex-1">{p.name}</p>
                    {alreadyToday ? (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="w-3 h-3" /> avaliado hoje
                      </span>
                    ) : myRatings[p.id] ? (
                      <span className="text-xl">{myRatings[p.id]}</span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {RATINGS.map(r => (
                      <button
                        key={r.emoji}
                        onClick={() => handleRate(p.id, r.emoji)}
                        disabled={saving === p.id || alreadyToday}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all ${
                          alreadyToday
                            ? 'border-bbb-border text-gray-600 opacity-50 cursor-not-allowed'
                            : myRatings[p.id] === r.emoji
                            ? 'bg-pink-500/20 border-pink-500 text-white scale-105'
                            : 'border-bbb-border text-gray-400 hover:border-pink-500/50 hover:bg-pink-500/5'
                        }`}
                      >
                        <span className="text-xl">{r.emoji}</span>
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {others.length === 0 && (
              <div className="card p-8 text-center text-gray-500">Nenhum participante para avaliar</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!unlocked ? (
              <div className="card p-10 flex flex-col items-center gap-4 text-center">
                <Clock className="w-10 h-10 text-pink-400" />
                <p className="text-white font-bold text-lg">Resultados às 19h</p>
                <p className="text-gray-400 text-sm">Falta</p>
                <span className="text-3xl font-black text-pink-400 tabular-nums">{countdown}</span>
              </div>
            ) : results.length === 0 ? (
              <div className="card p-8 text-center text-gray-500">Nenhuma avaliação ainda</div>
            ) : results.map((r, i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <span className="text-lg font-black text-gray-500 w-6 text-center">{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-bbb-purple/30 flex items-center justify-center text-lg overflow-hidden shrink-0">
                  <Avatar src={r.user?.photo_url} name={r.user?.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{r.user?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1.5 flex-1 bg-bbb-border rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${(r.avg / 4) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{r.avg}/4</span>
                  </div>
                </div>
                <span className="text-2xl">{AVG_EMOJI(r.avg)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
