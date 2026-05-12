'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setError('Informe um CPF válido.');
      return;
    }
    if (!senha) {
      setError('Informe sua senha.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // RPC ainda não está no types gerados; cast pontual aqui.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: email, error: rpcError } = await (supabase as any).rpc('get_email_by_cpf', { p_cpf: cpfLimpo });
      if (rpcError) {
        setError('Erro ao buscar usuário. Tente novamente.');
        return;
      }
      if (!email) {
        setError('CPF não encontrado ou usuário inativo.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email as string,
        password: senha,
      });
      if (signInError) {
        setError('Senha incorreta.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
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
                className="flex items-start gap-2 px-3 py-2 rounded-md text-[13px]"
                style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
              >
                <AlertCircle size={14} className="mt-[2px] shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
