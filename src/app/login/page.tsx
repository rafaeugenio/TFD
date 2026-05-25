'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div
      className="min-h-screen w-full"
      style={{ background: 'var(--tfd-surface-ground)' }}
    >
      <div
        className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2"
        style={{ background: 'var(--tfd-white, #fff)' }}
      >
        {/* LEFT PANEL — visual */}
        <aside
          className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 2xl:p-20 text-white overflow-hidden"
          style={{
            background:
              'radial-gradient(120% 90% at 0% 0%, var(--tfd-blue-400) 0%, var(--tfd-blue-600) 45%, var(--tfd-blue-700) 100%)',
          }}
        >
          {/* decorative gradient orbs */}
          <div
            aria-hidden
            className="absolute -top-20 -right-16 w-[320px] h-[320px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 60%)',
              filter: 'blur(20px)',
            }}
          />
          <div
            aria-hidden
            className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(125, 211, 252, 0.45), transparent 65%)',
              filter: 'blur(30px)',
            }}
          />

          {/* top: brand mark */}
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

          {/* middle: tagline */}
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

          {/* bottom: pills */}
          <div className="relative flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <ShieldCheck size={13} /> Acesso seguro
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <MapPin size={13} /> Maranhão
            </span>
          </div>
        </aside>

        {/* RIGHT PANEL — form */}
        <section className="flex flex-col p-6 sm:p-10 lg:p-12 xl:p-16 2xl:p-20">
          {/* mobile brand mark */}
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

          <div className="flex-1 flex flex-col justify-center max-w-[380px] w-full mx-auto">
            <header className="mb-7">
              <h1
                className="text-[26px] font-bold tracking-tight"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                Entrar na sua conta
              </h1>
              <p
                className="text-[14px] mt-1.5"
                style={{ color: 'var(--tfd-text-muted)' }}
              >
                Informe seu CPF e senha para continuar.
              </p>
            </header>

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
              className="text-[12px] mt-6 text-center"
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

          {/* footer */}
          <footer
            className="mt-8 pt-6 flex items-center justify-between text-[11px]"
            style={{ color: 'var(--tfd-text-muted)', borderTop: '1px solid var(--tfd-border-subtle, #E5E7EB)' }}
          >
            <span>© {new Date().getFullYear()} SES-MA</span>
            <span>v2.0</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
