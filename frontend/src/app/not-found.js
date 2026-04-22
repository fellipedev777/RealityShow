'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-8xl mb-4">🏠</p>
        <h1 className="text-3xl font-black text-white mb-2">Página não encontrada</h1>
        <p className="text-gray-400 mb-6">Essa parte da casa não existe!</p>
        <Link href="/dashboard" className="btn-primary inline-flex">
          <Home className="w-4 h-4" /> Voltar para a Casa
        </Link>
      </div>
    </div>
  );
}
