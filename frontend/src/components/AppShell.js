'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useSocket } from '@/hooks/useSocket';
import { participantsAPI, messagesAPI } from '@/lib/api';
import { disconnectSocket, getSocket } from '@/lib/socket';
import {
  Home, MessageSquare, Trophy, Vote, Mic2, Users,
  LogOut, Crown, Shield, Settings, Bell, ChevronDown, X
} from 'lucide-react';

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, setUser, setToken, logout, gameState, announcements, clearAnnouncements, setParticipants, eliminationModal, closeElimination } = useStore();
  const socket = useSocket();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Auth guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('lr_token');
    const storedUser = localStorage.getItem('lr_user');
    if (!storedToken) {
      router.push('/');
      return;
    }
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  // Load participants and unread message count
  useEffect(() => {
    if (!token) return;
    participantsAPI.active().then(r => setParticipants(r.data.participants)).catch(() => {});
    messagesAPI.unreadCount().then(r => setUnreadMessages(r.data.count || 0)).catch(() => {});
  }, [token]);

  // Listen for private messages to update badge
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = (msg) => {
      if (msg.sender_id !== user?.id && !pathname.startsWith('/messages')) {
        setUnreadMessages(n => n + 1);
      }
    };
    s.on('private_message', handler);
    return () => s.off('private_message', handler);
  }, [user, pathname]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push('/');
  };

  const nav = [
    { href: '/dashboard', label: 'Casa', icon: Home },
    { href: '/prova', label: 'Provas', icon: Trophy },
    { href: '/votacao', label: 'Votação', icon: Vote },
    { href: '/sincerao', label: 'Sincerão', icon: Mic2 },
    { href: '/paredao', label: 'Paredão', icon: Shield },
    { href: '/messages', label: 'Mensagens', icon: MessageSquare, badge: unreadMessages },
  ];

  if (user?.is_admin) {
    nav.push({ href: '/admin', label: 'Admin', icon: Settings });
  }

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const leader = gameState?.current_leader_id;
  const angel = gameState?.current_angel_id;
  const week = gameState?.current_week || 1;
  const votacaoActive = gameState?.votacao_active === true || gameState?.votacao_active === 'true';
  const sinceracaoActive = gameState?.sincerao_active === true || gameState?.sincerao_active === 'true';

  // Block eliminated users
  if (user?.is_eliminated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-7xl">🚪</div>
          <div>
            <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-2">Você foi eliminado(a)</p>
            <h1 className="text-3xl font-black text-white mb-1">{user.name}</h1>
            <p className="text-gray-400 text-sm">Sua participação nesta temporada chegou ao fim.</p>
          </div>
          <div className="card p-5 border-red-500/20 bg-red-500/5">
            <p className="text-gray-300 text-sm leading-relaxed">
              Obrigado por participar do LiveReality! Você pode assistir ao restante da temporada, mas não tem mais acesso à casa.
            </p>
          </div>
          <button onClick={handleLogout} className="btn-outline px-6 py-2 text-sm">
            <LogOut className="w-4 h-4 mr-2 inline" /> Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Elimination Modal */}
      {eliminationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.92)'}}>
          <div className="max-w-lg w-full text-center space-y-6 animate-fade-in">
            <div className="text-6xl mb-2">🚪</div>
            <div>
              <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-2">
                {eliminationModal.isMe ? 'Você foi eliminado(a)' : 'Eliminado(a)'}
              </p>
              <h1 className="text-4xl font-black text-white">{eliminationModal.name}</h1>
            </div>
            <div className="card p-6 border-red-500/20 bg-red-500/5 text-left">
              <p className="text-gray-200 text-base leading-relaxed italic">"{eliminationModal.speech}"</p>
            </div>
            <button
              onClick={closeElimination}
              className="btn-danger px-8 py-3 text-base mx-auto"
            >
              {eliminationModal.isMe ? 'Entendido' : 'Fechar'}
            </button>
          </div>
        </div>
      )}
      {/* Top Bar */}
      <header className="glass border-b border-bbb-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl">
            <span className="text-bbb-gold">BBB</span>
            <span className="text-white">Zap</span>
            <span className="badge bg-bbb-purple/20 text-bbb-purple text-xs ml-1">Sem {week}</span>
          </Link>

          {/* Status indicators */}
          <div className="hidden md:flex items-center gap-2">
            {votacaoActive && (
              <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                🗳️ Votação Aberta
              </span>
            )}
            {sinceracaoActive && (
              <span className="badge bg-pink-500/20 text-pink-400 border border-pink-500/30 animate-pulse">
                🎤 Sincerão Ativo
              </span>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowAnnouncements(!showAnnouncements)}
                className="relative p-2 rounded-lg hover:bg-bbb-border transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-400" />
                {announcements.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {announcements.length > 9 ? '9+' : announcements.length}
                  </span>
                )}
              </button>

              {showAnnouncements && (
                <div className="absolute right-0 top-12 w-80 card shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-bbb-border">
                    <span className="font-semibold text-sm">Notificações</span>
                    <div className="flex gap-2">
                      <button onClick={() => clearAnnouncements()} className="text-xs text-gray-500 hover:text-white">Limpar</button>
                      <button onClick={() => setShowAnnouncements(false)}><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {announcements.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-6">Sem notificações</p>
                    ) : (
                      announcements.map((a, i) => (
                        <div key={i} className={`px-4 py-3 border-b border-bbb-border/50 text-sm ${
                          a.type === 'elimination' ? 'bg-red-500/5' :
                          a.type === 'success' ? 'bg-green-500/5' : ''
                        }`}>
                          <p className="text-gray-200">{a.content}</p>
                          <p className="text-gray-600 text-xs mt-1">{new Date(a.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-bbb-purple flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-300 max-w-24 truncate">{user?.name}</span>
              {user?.is_admin && <Crown className="w-4 h-4 text-bbb-gold" />}
            </div>

            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-bbb-border transition-colors text-gray-400 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-1">
          {nav.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive(href)
                  ? 'bg-bbb-purple text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-bbb-border'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {badge > 0 && (
                <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          ))}

          {/* Rooms quick nav */}
          <div className="mt-4 pt-4 border-t border-bbb-border">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 mb-2">Quartos</p>
            {[
              { slug: 'sala-principal', label: '🏠 Sala Principal' },
              { slug: 'quarto-lider', label: '👑 Quarto Líder' },
              { slug: 'quarto-azul', label: '💙 Quarto Azul' },
              { slug: 'quarto-rosa', label: '🌸 Quarto Rosa' },
              { slug: 'quarto-verde', label: '💚 Quarto Verde' },
            ].map(r => (
              <Link
                key={r.slug}
                href={`/room/${r.slug}`}
                className={`flex items-center px-4 py-2 rounded-xl text-xs transition-all ${
                  pathname === `/room/${r.slug}`
                    ? 'text-white bg-bbb-border'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-bbb-border/50'
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-bbb-border z-50">
        <div className="flex justify-around py-1">
          {nav.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs transition-all ${
                isActive(href) ? 'text-bbb-gold' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{fontSize: '9px'}}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[40px] text-center" style={{fontSize: '10px'}}>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
