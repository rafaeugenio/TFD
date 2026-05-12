'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Página de primeiro acesso: usuário cai aqui depois de clicar no link
 * enviado por email quando o admin cria a conta. O Supabase Auth já trocou
 * o token do link por uma sessão válida ao carregar a página — basta o
 * usuário definir a senha definitiva.
 */
export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setSessionChecked(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirma) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: senha });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    // Marca primeiro_acesso = false (best effort — não bloqueia o fluxo).
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('usuarios')
          .update({ primeiro_acesso: false } as never)
          .eq('id', user.id);
      }
    } catch {
      // segue o fluxo mesmo se a flag não atualizar
    }

    setLoading(false);
    setDone(true);
    setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 1800);
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tfd-surface-ground)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tfd-surface-ground)' }}>
        <div className="w-full max-w-[400px] tfd-card text-center">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#B91C1C' }} />
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
            Link inválido ou expirado
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--tfd-text-muted)' }}>
            Peça ao administrador para reenviar o link de primeiro acesso.
          </p>
          <Link href="/login" className="tfd-btn tfd-btn-primary w-full justify-center">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tfd-surface-ground)' }}>
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--tfd-primary-500)', color: 'white' }}
          >
            <UserPlus size={22} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
            Bem-vindo ao TFD
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Crie uma senha para concluir seu cadastro e acessar o sistema.
          </p>
        </div>

        <div className="tfd-card">
          {done ? (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md text-[13px]"
              style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
              <CheckCircle2 size={14} className="mt-[2px] shrink-0" />
              <span>Senha criada com sucesso. Redirecionando para o login...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md text-[13px]"
                  style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  <AlertCircle size={14} className="mt-[2px] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="tfd-label" htmlFor="senha">Defina sua senha</label>
                <div className="relative">
                  <input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    className="tfd-input pr-10"
                    placeholder="Mínimo 8 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoFocus
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

              <div>
                <label className="tfd-label" htmlFor="confirma">Confirmar senha</label>
                <input
                  id="confirma"
                  type={showPassword ? 'text' : 'password'}
                  className="tfd-input"
                  placeholder="Digite novamente"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                />
              </div>

              <button type="submit" className="tfd-btn tfd-btn-primary w-full" disabled={loading}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                  : <><KeyRound size={16} /> Criar senha e continuar</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
