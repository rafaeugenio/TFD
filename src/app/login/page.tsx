'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, LogIn, Eye, EyeOff, AlertCircle, ShieldCheck, HeartPulse, MapPin } from 'lucide-react';
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
    <div className="tfd-auth-shell">
      <div aria-hidden className="tfd-auth-shell__glow tfd-auth-shell__glow--tr" />
      <div aria-hidden className="tfd-auth-shell__glow tfd-auth-shell__glow--bl" />

      {/* LEFT — marketing sobre o gradiente da página */}
      <aside className="tfd-auth-brand">
        <div className="relative flex items-center gap-2">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <HeartPulse size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-wide">TFD</div>
            <div className="text-[11px] opacity-75">SES-MA</div>
          </div>
        </div>

        <div className="relative">
          <p className="text-[13px] font-medium opacity-80 mb-2">Você pode</p>
          <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight">
            Cuidar do paciente <br />
            do encaminhamento <br />
            ao retorno em casa.
          </h2>
          <p className="text-[14px] mt-4 opacity-80 max-w-[380px]">
            Uma plataforma única para gestão do Tratamento Fora do Domicílio —
            das solicitações ao acompanhamento das viagens.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <span className="tfd-auth-pill"><ShieldCheck size={13} /> Acesso seguro</span>
          <span className="tfd-auth-pill"><MapPin size={13} /> Maranhão</span>
        </div>
      </aside>

      {/* RIGHT — card flutuante com o formulário */}
      <section className="tfd-auth-card">
        {/* brand mark mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'var(--tfd-blue)', color: 'white' }}
          >
            <HeartPulse size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>TFD</div>
            <div className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>SES-MA</div>
          </div>
        </div>

        <div className="tfd-auth-card__body">
          <div className="tfd-auth-card__stack">
          <header className="flex flex-col gap-1.5">
            <h1
              className="text-[26px] font-bold tracking-tight leading-[1.2]"
              style={{ color: 'var(--tfd-text-primary)' }}
            >
              Entrar na sua conta
            </h1>
            <p
              className="text-[14px] leading-[1.5]"
              style={{ color: 'var(--tfd-text-muted)' }}
            >
              Informe seu CPF e senha para continuar.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              <label className="tfd-label" htmlFor="cpf">CPF</label>
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
              <div className="flex items-center justify-between mb-1">
                <label className="tfd-label !mb-0" htmlFor="senha">Senha</label>
                <Link
                  href="/recuperar-senha"
                  className="text-[12px] font-medium hover:underline"
                  style={{ color: 'var(--tfd-blue)' }}
                >
                  Esqueceu a senha?
                </Link>
              </div>
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
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="tfd-btn tfd-btn-primary tfd-btn--lg w-full"
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

          <p
            className="text-[12px] text-center"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Primeiro acesso?{' '}
            <Link
              href="/primeiro-acesso"
              className="font-medium hover:underline"
              style={{ color: 'var(--tfd-blue)' }}
            >
              Cadastrar senha
            </Link>
          </p>
          </div>
        </div>

        <footer className="tfd-auth-card__footer">
          <span>© {new Date().getFullYear()} SES-MA · v2.0</span>
          <Image
            src="/brand/citiesoft-logo.svg"
            alt="Citiesoft"
            width={80}
            height={13}
            priority
          />
        </footer>
      </section>
    </div>
  );
}
