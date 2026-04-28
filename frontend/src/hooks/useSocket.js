'use client';

import { useEffect, useRef } from 'react';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useStore } from '@/lib/store';

export function useSocket() {
  const { token, user, setGameState, updateGameState, addAnnouncement, setActiveProva,
          setCurrentQuestion, setProvaScores, setParedaoUsers, showElimination, updateUser,
          setParticipants } = useStore();
  const listenersSet = useRef(false);

  useEffect(() => {
    if (!token || listenersSet.current) return;

    const socket = initSocket(token);
    listenersSet.current = true;

    socket.on('game_state', (state) => setGameState(state));

    socket.on('announcement', (ann) => addAnnouncement(ann));

    socket.on('prova_started', (data) => {
      setActiveProva({ id: data.prova_id, type: data.type, title: data.title });
    });

    socket.on('prova_question', (data) => {
      setCurrentQuestion(data);
    });

    socket.on('prova_scores_update', (data) => {
      setProvaScores(data.scores || []);
    });

    socket.on('prova_ended', (data) => {
      setCurrentQuestion(null);
      if (data.type === 'lider' && data.winner) {
        updateGameState('current_leader_id', data.winner.id);
      }
      if (data.type === 'anjo' && data.winner) {
        updateGameState('current_angel_id', data.winner.id);
      }
    });

    socket.on('paredao_formed', (data) => {
      setParedaoUsers(data.participants || []);
    });

    socket.on('participant_eliminated', (data) => {
      showElimination({ name: data.name, speech: data.speech, isMe: data.user_id === user?.id });
      if (data.user_id === user?.id) {
        updateUser({ is_eliminated: true });
      }
      setParticipants(useStore.getState().participants.filter(p => p.id !== data.user_id));
      addAnnouncement({
        id: Date.now().toString(),
        content: `❌ ${data.name} foi eliminado(a) do LiveReality!`,
        type: 'elimination',
        created_at: new Date().toISOString()
      });
    });

    socket.on('leader_set', (data) => {
      updateGameState('current_leader_id', data.user_id);
    });

    socket.on('angel_set', (data) => {
      updateGameState('current_angel_id', data.user_id);
    });

    socket.on('votacao_opened', () => updateGameState('votacao_active', true));
    socket.on('votacao_closed', () => updateGameState('votacao_active', false));
    socket.on('sincerao_opened', (d) => updateGameState('sincerao_active', true));
    socket.on('sincerao_closed', () => updateGameState('sincerao_active', false));

    socket.on('new_week', (data) => {
      updateGameState('current_week', data.week);
      addAnnouncement({
        id: Date.now().toString(),
        content: `🎉 Semana ${data.week} começou! Novos desafios te aguardam!`,
        type: 'success',
        created_at: new Date().toISOString()
      });
    });

    socket.on('scheduled_event', (data) => {
      addAnnouncement({
        id: Date.now().toString(),
        content: `📅 ${data.title} iniciado automaticamente!`,
        type: 'info',
        created_at: new Date().toISOString()
      });
    });

    return () => {
      listenersSet.current = false;
    };
  }, [token]);

  return getSocket();
}
