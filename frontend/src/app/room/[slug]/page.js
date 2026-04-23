'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Chat from '@/components/Chat';
import { useStore } from '@/lib/store';
import { roomsAPI } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Users, Lock, ArrowLeft } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Link from 'next/link';

export default function RoomPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { token, user } = useStore();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    loadRoom();
  }, [token, slug]);

  // Listen to room presence events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room) return;

    const handleJoined = (data) => {
      if (data.room_id === room.id) {
        setOnlineUsers(prev => [...prev.filter(u => u.userId !== data.userId), { userId: data.userId, userName: data.userName }]);
      }
    };
    const handleLeft = (data) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    socket.on('user_joined_room', handleJoined);
    socket.on('user_left_room', handleLeft);
    return () => { socket.off('user_joined_room', handleJoined); socket.off('user_left_room', handleLeft); };
  }, [room]);

  const loadRoom = async () => {
    try {
      const res = await roomsAPI.get(slug);
      setRoom(res.data.room);
      setMessages(res.data.messages || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar quarto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-bbb-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Entrando no quarto...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
          <Lock className="w-12 h-12 text-red-400" />
          <div>
            <p className="text-red-400 font-semibold">{error}</p>
            <p className="text-gray-500 text-sm mt-1">Você não tem acesso a este quarto</p>
          </div>
          <Link href="/dashboard" className="btn-outline">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </AppShell>
    );
  }

  const participants = room?.room_participants || [];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]">
        {/* Room header */}
        <div className="card mb-4 px-4 py-3 flex items-center gap-3 shrink-0">
          <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-bbb-border transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: (room?.color || '#1a1a2e') + '40' }}
          >
            {room?.icon || '🏠'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white">{room?.name}</h1>
            <p className="text-xs text-gray-500">{room?.description}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span>{participants.length}</span>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Chat */}
          <div className="flex-1 card overflow-hidden flex flex-col">
            <Chat roomId={room?.id} initialMessages={messages} />
          </div>

          {/* Participants in room */}
          <div className="hidden xl:flex w-52 shrink-0 card overflow-hidden flex-col">
            <div className="px-4 py-3 border-b border-bbb-border">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4" /> Neste Quarto
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {participants.map(({ users: p }) => p && (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                    <Avatar src={p.photo_url} name={p.name} />
                  </div>
                  <span className="text-sm text-gray-300 truncate">{p.name}</span>
                  <span className="ml-auto w-2 h-2 bg-green-400 rounded-full shrink-0" title="Online" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
