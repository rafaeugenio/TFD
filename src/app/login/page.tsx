'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Mock: skip authentication, go straight to dashboard
    await new Promise((r) => setTimeout(r, 400));
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
            <div>
              <label className="tfd-label" htmlFor="cpf">
                CPF
              </label>
              <input
                id="cpf"
                type="text"
                className="tfd-input"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
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
        </div>
      </div>
    </div>
  );
}
