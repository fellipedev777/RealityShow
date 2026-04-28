'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import LiveRanking from '@/components/LiveRanking';
import CountdownTimer from '@/components/CountdownTimer';
import { useStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Trophy, CheckCircle, XCircle, Clock, Zap, Crown } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = {
  A: 'border-blue-500/50 hover:bg-blue-500/10 hover:border-blue-500',
  B: 'border-green-500/50 hover:bg-green-500/10 hover:border-green-500',
  C: 'border-yellow-500/50 hover:bg-yellow-500/10 hover:border-yellow-500',
  D: 'border-red-500/50 hover:bg-red-500/10 hover:border-red-500',
};
const OPTION_ACTIVE = {
  A: 'bg-blue-500/20 border-blue-500 text-white',
  B: 'bg-green-500/20 border-green-500 text-white',
  C: 'bg-yellow-500/20 border-yellow-500 text-white',
  D: 'bg-red-500/20 border-red-500 text-white',
};

export default function ProvaPage() {
  const router = useRouter();
  const { token, activeProva, setActiveProva, currentQuestion, setCurrentQuestion, provaScores, setProvaScores, user } = useStore();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null); // { is_correct, correct_answer }
  const [provaEnded, setProvaEnded] = useState(null);
  const [waitingScreen, setWaitingScreen] = useState(true);
  const socket = getSocket();

  useEffect(() => {
    if (!token) { router.push('/'); return; }
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('prova_started', (data) => {
      setActiveProva({ id: data.prova_id, type: data.type, title: data.title });
      setWaitingScreen(false);
      setProvaEnded(null);
      setSelectedAnswer(null);
      setAnswered(false);
      setResult(null);
    });

    socket.on('prova_question', (data) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setAnswered(false);
      setResult(null);
    });

    socket.on('answer_result', (data) => {
      setResult(data);
    });

    socket.on('prova_scores_update', (data) => {
      setProvaScores(data.scores || []);
    });

    socket.on('prova_ended', (data) => {
      setProvaEnded(data);
      setCurrentQuestion(null);
      setActiveProva(null);
      setWaitingScreen(true);
    });

    return () => {
      socket.off('prova_started');
      socket.off('prova_question');
      socket.off('answer_result');
      socket.off('prova_scores_update');
      socket.off('prova_ended');
    };
  }, [socket]);

  const handleAnswer = (option) => {
    if (answered || !currentQuestion || !socket) return;
    setSelectedAnswer(option);
    setAnswered(true);
    socket.emit('prova_answer', {
      prova_id: activeProva?.id || currentQuestion.prova_id,
      question_id: currentQuestion.question.id,
      answer: option
    });
  };

  // Ended screen
  if (provaEnded) {
    const isWinner = provaEnded.winner?.id === user?.id || provaEnded.scores?.[0]?.user_id === user?.id;
    const myScore = provaEnded.scores?.find(s => s.user_id === user?.id);
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
          <div className={`card p-8 text-center ${isWinner ? 'border-bbb-gold gold-glow' : ''}`}>
            <div className="text-6xl mb-4">{isWinner ? '🏆' : '🎯'}</div>
            <h1 className="text-2xl font-black text-white mb-2">
              {provaEnded.type === 'lider' ? 'Prova do Líder' : 'Prova do Anjo'} Encerrada!
            </h1>
            {provaEnded.winner && (
              <div className="mt-4 p-4 bg-bbb-gold/10 border border-bbb-gold/30 rounded-xl">
                <p className="text-bbb-gold font-bold text-lg">
                  {isWinner ? '🎉 Parabéns! Você venceu!' : `🏅 Vencedor: ${provaEnded.winner.name}`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Com {provaEnded.winner_score} pontos
                </p>
              </div>
            )}
            {myScore && (
              <p className="text-gray-400 mt-3">
                Sua pontuação: <strong className="text-white">{myScore.score} pts</strong> · {myScore.correct_count}/{myScore.answers_count} corretas
              </p>
            )}
          </div>
          <LiveRanking scores={provaEnded.scores || []} provaTitle="Resultado Final" />
        </div>
      </AppShell>
    );
  }

  // Waiting screen
  if (waitingScreen && !currentQuestion) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
          <div className="card p-8 text-center">
            <div className="w-20 h-20 bg-bbb-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-10 h-10 text-bbb-gold" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Provas</h1>
            <p className="text-gray-400 mb-6">
              Aguarde o administrador iniciar uma prova. Ela irá aparecer aqui automaticamente!
            </p>
            <div className="p-4 bg-bbb-dark rounded-xl border border-bbb-border">
              <p className="text-sm text-gray-500 mb-3 font-semibold">Como funcionam as provas:</p>
              <div className="space-y-2 text-sm text-gray-400 text-left">
                <div className="flex gap-2"><span className="text-bbb-gold">👑</span> <span><strong>Prova do Líder</strong> — define o líder da semana</span></div>
                <div className="flex gap-2"><span className="text-blue-400">⭐</span> <span><strong>Prova do Anjo</strong> — define o anjo da semana</span></div>
                <div className="flex gap-2"><span className="text-green-400">🏡</span> <span><strong>Quarta</strong> — Convivência</span></div>
                <div className="flex gap-2"><span className="text-pink-400">🎤</span> <span><strong>Sexta</strong> — Sincerão</span></div>
                <div className="flex gap-2"><span className="text-gray-400">🎯</span> <span>10 perguntas, 15 segundos cada</span></div>
                <div className="flex gap-2"><span className="text-gray-400">🏆</span> <span>Maior pontuação vence!</span></div>
              </div>
            </div>
          </div>

          {provaScores.length > 0 && <LiveRanking scores={provaScores} />}
        </div>
      </AppShell>
    );
  }

  // Active question
  const q = currentQuestion?.question;
  const opts = q ? [
    { key: 'A', text: q.options?.A },
    { key: 'B', text: q.options?.B },
    { key: 'C', text: q.options?.C },
    { key: 'D', text: q.options?.D },
  ] : [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4 pb-20 lg:pb-6">
        {/* Prova header */}
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-bbb-gold/20 rounded-xl flex items-center justify-center shrink-0">
            {activeProva?.type === 'lider' ? <Crown className="w-5 h-5 text-bbb-gold" /> : <Zap className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">{activeProva?.title || 'Prova em Andamento'}</h2>
            <p className="text-xs text-gray-500">
              Pergunta {(currentQuestion?.question_index ?? 0) + 1} de {currentQuestion?.total || '?'}
            </p>
          </div>
          {currentQuestion?.time_limit && (
            <div className="w-24">
              <CountdownTimer seconds={currentQuestion.time_limit} />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Question */}
          <div className="md:col-span-2 space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="badge bg-bbb-purple/20 text-bbb-purple">
                  Pergunta {(currentQuestion?.question_index ?? 0) + 1}
                </span>
                {answered && result && (
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {result.is_correct
                      ? <><CheckCircle className="w-4 h-4" /> Correto! +10pts</>
                      : <><XCircle className="w-4 h-4" /> Errou!</>
                    }
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold text-white leading-relaxed mb-6">{q?.text}</p>

              <div className="grid grid-cols-1 gap-3">
                {opts.map(({ key, text }) => {
                  let cls = `border rounded-xl p-4 text-left transition-all flex items-center gap-3 `;
                  if (!answered) {
                    cls += `border-bbb-border cursor-pointer ${OPTION_COLORS[key]}`;
                  } else if (selectedAnswer === key) {
                    if (result?.is_correct) {
                      cls += 'bg-green-500/20 border-green-500 text-white cursor-default';
                    } else {
                      cls += 'bg-red-500/20 border-red-500 text-white cursor-default';
                    }
                  } else if (result && result.correct_answer === key) {
                    cls += 'bg-green-500/10 border-green-500/50 text-green-400 cursor-default';
                  } else {
                    cls += 'border-bbb-border text-gray-500 cursor-default opacity-50';
                  }

                  return (
                    <button key={key} onClick={() => handleAnswer(key)} className={cls} disabled={answered}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        answered && result?.correct_answer === key ? 'bg-green-500 text-white' :
                        answered && selectedAnswer === key && !result?.is_correct ? 'bg-red-500 text-white' :
                        'bg-bbb-border text-gray-400'
                      }`}>{key}</span>
                      <span className="text-sm">{text}</span>
                    </button>
                  );
                })}
              </div>

              {!answered && (
                <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Responda antes do tempo acabar!
                </p>
              )}
            </div>
          </div>

          {/* Live ranking */}
          <div>
            <LiveRanking scores={provaScores} provaTitle="Ranking Ao Vivo" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
