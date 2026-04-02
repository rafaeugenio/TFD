'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : authError.message,
      );
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--tfd-surface-ground)' }}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--tfd-primary-500)', color: 'white' }}
          >
            <span className="text-xl font-bold">TFD</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Entrar no sistema
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Tratamento Fora do Domicílio — SES-MA
          </p>
        </div>

        {/* Form Card */}
        <div className="tfd-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="tfd-message tfd-message--danger"
              >
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="tfd-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="tfd-input"
                placeholder="seu.email@ses.ma.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="tfd-label" htmlFor="senha">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  className="tfd-input pr-10"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--tfd-text-muted)' }}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/recuperar-senha"
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--tfd-primary-500)' }}
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              className="tfd-btn tfd-btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <div
            className="mt-4 pt-4 text-center text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <span style={{ color: 'var(--tfd-text-muted)' }}>
              Não tem conta?{' '}
            </span>
            <Link
              href="/criar-conta"
              className="font-medium hover:underline"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
