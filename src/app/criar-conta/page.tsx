'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const PERFIS = [
  { value: 'ATENDENTE_MUNICIPAL', label: 'Atendente Municipal' },
  { value: 'ATENDENTE_REGIONAL', label: 'Atendente Regional' },
  { value: 'COORDENACAO_ESTADUAL', label: 'Coordenação Estadual' },
  { value: 'MEDICO_AUDITOR', label: 'Médico Auditor' },
  { value: 'SETOR_REGULACAO', label: 'Setor de Regulação' },
  { value: 'SETOR_PASSAGENS', label: 'Setor de Passagens' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'ASSISTENTE_SOCIAL', label: 'Assistente Social' },
  { value: 'CONTROLE_INTERNO', label: 'Controle Interno' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function CriarContaPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!perfil) {
      setError('Selecione um perfil de acesso.');
      return;
    }

    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setError('CPF inválido. Informe os 11 dígitos.');
      return;
    }

    setLoading(true);

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
      const { error: dbError } = await supabase.from('usuarios').insert({
        id: authData.user.id,
        nome_completo: nome.trim(),
        cpf: cpfDigits,
        email,
        senha_hash: 'managed_by_supabase_auth',
        perfil,
        ativo: true,
        primeiro_acesso: true,
      } as any);

      if (dbError) {
        setError(`Conta criada, mas erro ao salvar dados: ${dbError.message}`);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
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
            <LogInIcon size={16} />
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
            Preencha seus dados para acessar o sistema
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
                required
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
                placeholder="seu.email@ses.ma.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="tfd-label" htmlFor="perfil">
                Perfil de acesso
              </label>
              <select
                id="perfil"
                className="tfd-input"
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
                required
              >
                <option value="">Selecione o perfil...</option>
                {PERFIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
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
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogInIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
