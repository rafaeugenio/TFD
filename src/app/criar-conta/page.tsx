'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, UserPlus, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CriarContaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tfd-surface-ground)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
      </div>
    }>
      <CriarContaContent />
    </Suspense>
  );
}

function CriarContaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const nomeParam = searchParams.get('nome') ?? '';
  const emailParam = searchParams.get('email') ?? '';

  const [nome, setNome] = useState(nomeParam);
  const [email] = useState(emailParam);
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function formatPhone(value: string): string {
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    return v;
  }

  // If no token, show access denied
  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--tfd-surface-ground)' }}
      >
        <div className="w-full max-w-[400px] text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#FEE2E2', color: '#EF4444' }}
          >
            <ShieldCheck size={24} />
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Link inválido
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--tfd-text-secondary)' }}
          >
            Este link de cadastro é inválido ou já foi utilizado. Solicite um novo convite ao administrador do sistema.
          </p>
          <Link
            href="/login"
            className="tfd-btn tfd-btn-secondary inline-flex"
          >
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // 2. Create usuarios record linked to auth user
      if (authData.user) {
        await supabase.from('usuarios').insert({
          id: authData.user.id,
          nome_completo: nome.trim(),
          email,
          telefone: telefone.replace(/\D/g, '') || null,
          senha_hash: 'managed_by_supabase_auth',
          perfil: 'ATENDENTE_MUNICIPAL',
          ativo: true,
          primeiro_acesso: true,
        } as any);
      }

      setLoading(false);
      setSuccess(true);
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--tfd-surface-ground)' }}
      >
        <div className="w-full max-w-[400px] text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#16A34A', color: 'white' }}
          >
            <UserPlus size={24} />
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Conta criada!
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--tfd-text-secondary)' }}
          >
            Sua conta foi criada com sucesso. Você já pode fazer login no sistema.
          </p>
          <Link
            href="/login"
            className="tfd-btn tfd-btn-primary inline-flex"
          >
            <ArrowLeft size={16} />
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'var(--tfd-surface-ground)' }}
    >
      <div className="w-full max-w-[440px]">
        {/* Header */}
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
            Criar conta
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Complete seu cadastro para acessar o sistema
          </p>
        </div>

        {/* Form */}
        <div className="tfd-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="tfd-message tfd-message--danger">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="tfd-label" htmlFor="nome">
                Nome completo
              </label>
              <input
                id="nome"
                type="text"
                className="tfd-input"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="tfd-label" htmlFor="email-reg">
                E-mail
              </label>
              <input
                id="email-reg"
                type="email"
                className="tfd-input"
                value={email}
                readOnly
                style={{ backgroundColor: 'var(--tfd-surface-50)', color: 'var(--tfd-text-secondary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                O e-mail foi definido pelo administrador e não pode ser alterado.
              </p>
            </div>

            <div>
              <label className="tfd-label" htmlFor="telefone">
                Telefone <span style={{ color: 'var(--tfd-text-muted)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                id="telefone"
                type="tel"
                className="tfd-input"
                placeholder="(99) 99999-0000"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
              />
            </div>

            <div>
              <label className="tfd-label" htmlFor="senha-reg">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha-reg"
                  type={showPassword ? 'text' : 'password'}
                  className="tfd-input pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
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
              <label className="tfd-label" htmlFor="confirmar-senha">
                Confirmar senha
              </label>
              <input
                id="confirmar-senha"
                type={showPassword ? 'text' : 'password'}
                className="tfd-input"
                placeholder="Repita a senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="tfd-btn tfd-btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Criar conta
                </>
              )}
            </button>
          </form>

          <div
            className="mt-4 pt-4 text-center text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-medium hover:underline"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              <ArrowLeft size={14} />
              Já tenho conta — fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
