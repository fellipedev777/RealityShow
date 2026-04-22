'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useStore } from '@/lib/store';
import { messagesAPI, participantsAPI } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { MessageCircle, Send, ArrowLeft, Search, Lock, Users } from 'lucide-react';

function Avatar({ user, size = 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-full bg-bbb-purple flex items-center justify-center font-bold shrink-0 overflow-hidden`}>
      {user?.photo_url
        ? <img src={user.photo_url} alt={user?.name} className="w-full h-full object-cover" />
        : user?.name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useStore();
  const [conversations, setConversations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState({});
  const bottomRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (!token) { router.push('/'); return; }
    loadConversations();
    participantsAPI.active().then(r => setParticipants(r.data.participants || [])).catch(() => {});

    // Open conversation from URL param
    const partnerId = searchParams.get('with');
    if (partnerId) openConversation({ id: partnerId });
  }, [token]);

  // Socket: receive private messages in real-time
  useEffect(() => {
    if (!socket) return;

    const handlePrivateMsg = (msg) => {
      const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;

      if (activePartner?.id === partnerId || activePartner?.id === msg.sender_id) {
        setMessages(prev => [...prev, msg]);
        // Mark as read if conversation is open
        if (msg.sender_id !== user?.id) {
          socket.emit('mark_read', { sender_id: msg.sender_id });
        }
      } else if (msg.sender_id !== user?.id) {
        // Add unread badge
        setUnread(u => ({ ...u, [msg.sender_id]: (u[msg.sender_id] || 0) + 1 }));
      }

      // Update conversation list preview
      setConversations(prev => {
        const existing = prev.findIndex(c => c.partner?.id === partnerId);
        const preview = {
          partner: msg.sender?.id === user?.id ? activePartner : msg.sender,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unread: msg.sender_id !== user?.id ? 1 : 0,
          isMine: msg.sender_id === user?.id
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...preview };
          return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        }
        return [preview, ...prev];
      });
    };

    socket.on('private_message', handlePrivateMsg);
    return () => socket.off('private_message', handlePrivateMsg);
  }, [socket, activePartner, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await messagesAPI.conversations();
      setConversations(res.data.conversations || []);
      const u = {};
      (res.data.conversations || []).forEach(c => { if (c.unread > 0) u[c.partner?.id] = c.unread; });
      setUnread(u);
    } catch {}
    finally { setLoading(false); }
  };

  const openConversation = async (partner) => {
    setActivePartner(partner);
    setMessages([]);
    setUnread(u => { const n = { ...u }; delete n[partner.id]; return n; });
    try {
      const res = await messagesAPI.getConversation(partner.id);
      setActivePartner(res.data.partner || partner);
      setMessages(res.data.messages || []);
      socket?.emit('mark_read', { sender_id: partner.id });
      setShowNewChat(false);
    } catch {}
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activePartner || !socket) return;
    socket.emit('private_message', { receiver_id: activePartner.id, content: input.trim() });
    setInput('');
  };

  const filteredParticipants = participants.filter(p =>
    p.id !== user?.id &&
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <AppShell>
      <div className="flex gap-0 h-[calc(100vh-7rem)] lg:h-[calc(100vh-5rem)] card overflow-hidden">

        {/* Sidebar: conversations */}
        <div className={`flex flex-col w-full lg:w-72 shrink-0 border-r border-bbb-border ${activePartner ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-bbb-border">
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-bbb-purple" />
                Mensagens
                {totalUnread > 0 && (
                  <span className="badge bg-red-500 text-white text-xs">{totalUnread}</span>
                )}
              </h1>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="p-2 rounded-lg bg-bbb-purple hover:bg-purple-700 transition-colors"
                title="Nova conversa"
              >
                <Users className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* New chat search */}
            {showNewChat ? (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar participante..."
                  className="input pl-9 py-2 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="input pl-9 py-2 text-sm"
                />
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {/* New chat participants */}
            {showNewChat && (
              <div className="divide-y divide-bbb-border/30">
                <p className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Participantes
                </p>
                {filteredParticipants.map(p => (
                  <button
                    key={p.id}
                    onClick={() => openConversation(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bbb-border/50 transition-colors text-left"
                  >
                    <Avatar user={p} size="sm" />
                    <span className="text-sm text-white">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Existing conversations */}
            {!showNewChat && (
              <div className="divide-y divide-bbb-border/30">
                {loading && (
                  <div className="text-center text-gray-500 text-sm py-8">Carregando...</div>
                )}
                {!loading && conversations.length === 0 && (
                  <div className="text-center text-gray-500 py-10 px-4">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhuma conversa ainda.</p>
                    <p className="text-xs mt-1">Clique em 👥 para iniciar.</p>
                  </div>
                )}
                {conversations
                  .filter(c => c.partner?.name?.toLowerCase().includes(search.toLowerCase()))
                  .map((conv, i) => (
                    <button
                      key={conv.partner?.id || i}
                      onClick={() => openConversation(conv.partner)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bbb-border/50 transition-colors text-left ${
                        activePartner?.id === conv.partner?.id ? 'bg-bbb-border' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar user={conv.partner} size="sm" />
                        {unread[conv.partner?.id] > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {unread[conv.partner?.id]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className={`text-sm font-medium truncate ${unread[conv.partner?.id] ? 'text-white' : 'text-gray-300'}`}>
                            {conv.partner?.name}
                          </span>
                          <span className="text-xs text-gray-600 shrink-0 ml-2">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${unread[conv.partner?.id] ? 'text-gray-200 font-medium' : 'text-gray-500'}`}>
                          {conv.isMine ? 'Você: ' : ''}{conv.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activePartner ? 'hidden lg:flex' : 'flex'}`}>
          {!activePartner ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-bbb-purple/10 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-10 h-10 text-bbb-purple opacity-50" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Mensagens Privadas</h2>
              <p className="text-gray-500 text-sm max-w-xs">
                Suas conversas são privadas e só você e a outra pessoa podem ver.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-bbb-border flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setActivePartner(null)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-bbb-border transition-colors text-gray-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar user={activePartner} size="sm" />
                <div>
                  <p className="font-semibold text-white text-sm">{activePartner.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Conversa privada
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-area">
                {messages.length === 0 && (
                  <div className="text-center text-gray-600 text-sm py-10">
                    <p>Início da conversa com <strong className="text-gray-400">{activePartner.name}</strong></p>
                    <p className="text-xs mt-1">💬 Mande a primeira mensagem!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id || i} className={`flex gap-2 animate-slide-in ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMine && <Avatar user={activePartner} size="sm" />}
                      <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          isMine
                            ? 'bg-bbb-purple text-white rounded-tr-sm'
                            : 'bg-bbb-border text-gray-100 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-600 px-1">
                          {formatTime(msg.created_at)}
                          {isMine && msg.read_at && ' · Lida'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-bbb-border flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Mensagem para ${activePartner.name}...`}
                  maxLength={1000}
                  className="input flex-1 py-2 text-sm"
                  autoFocus
                />
                <button type="submit" disabled={!input.trim()} className="btn-primary px-3 py-2 disabled:opacity-30">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
