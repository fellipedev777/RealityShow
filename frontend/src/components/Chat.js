'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Send, Hash } from 'lucide-react';

export default function Chat({ roomId, initialMessages = [] }) {
  const { user } = useStore();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('join_room', { room_id: roomId });

    const handleMsg = (msg) => {
      if (msg.room_id === roomId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('chat_message', handleMsg);
    return () => socket.off('chat_message', handleMsg);
  }, [socket, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || sending) return;
    setSending(true);
    socket.emit('send_message', { room_id: roomId, content: input.trim() });
    setInput('');
    setSending(false);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-area p-4 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-8">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Sem mensagens ainda. Seja o primeiro!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`message-enter flex gap-2 ${
              msg.user_id === user?.id ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            {msg.user_id !== user?.id && !msg.is_system && (
              <div className="w-7 h-7 rounded-full bg-bbb-purple flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                {msg.user_photo ? (
                  <img src={msg.user_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  msg.user_name?.[0]?.toUpperCase() || '?'
                )}
              </div>
            )}

            {/* Bubble */}
            {msg.is_system ? (
              <div className="mx-auto text-xs text-gray-500 italic bg-bbb-border/50 px-3 py-1.5 rounded-full">
                {msg.content}
              </div>
            ) : (
              <div className={`max-w-[75%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {msg.user_id !== user?.id && (
                  <span className={`text-xs px-1 font-semibold ${msg.is_admin ? 'text-bbb-gold' : 'text-gray-400'}`}>
                    {msg.is_admin && '⭐ '}{msg.user_name}
                  </span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                  msg.user_id === user?.id
                    ? 'bg-bbb-purple text-white rounded-tr-sm'
                    : msg.is_admin
                    ? 'bg-bbb-gold/10 border border-bbb-gold/30 text-white rounded-tl-sm'
                    : 'bg-bbb-border text-gray-100 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-600 px-1">{formatTime(msg.created_at)}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-bbb-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Mensagem..."
          maxLength={500}
          className="input flex-1 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-primary px-3 py-2 disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
