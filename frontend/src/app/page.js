'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Eye, EyeOff, Tv, Zap, Users, MessageCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken, token } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', photo_url: '' });

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await authAPI.login({ email: form.email, password: form.password });
      } else {
        if (!form.name) { setError('Nome é obrigatório'); setLoading(false); return; }
        res = await authAPI.register(form);
      }
      const { user, token } = res.data;
      setUser(user);
      setToken(token);
      if (typeof window !== 'undefined') localStorage.setItem('bbb_user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-bbb-gold rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Tv className="w-7 h-7 text-black" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white mb-1">
            Live<span className="text-bbb-gold">Reality</span>
          </h1>
          <p className="text-gray-400 text-sm">Reality Show Online em Tempo Real</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Multiplayer</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Tempo Real</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Chat ao Vivo</span>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex mb-8 bg-bbb-dark rounded-xl p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isLogin ? 'bg-bbb-purple text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isLogin ? 'bg-bbb-purple text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Seu Nome</label>
                <input
                  type="text"
                  placeholder="Como você quer ser chamado?"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="input pr-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  URL da Foto <span className="text-gray-600">(opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.photo_url}
                  onChange={e => update('photo_url', e.target.value)}
                  className="input"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full mt-6 text-base py-4">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                isLogin ? '🎬 Entrar na Casa' : '🏠 Entrar no Reality'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          LiveReality — Reality Show Online © 2024
        </p>
      </div>
    </div>
  );
}
