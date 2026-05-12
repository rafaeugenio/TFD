'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/redefinir-senha` },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
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
            <CheckCircle2 size={24} />
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            E-mail enviado!
          </h1>
          <p
            className="text-sm mb-2"
            style={{ color: 'var(--tfd-text-secondary)' }}
          >
            Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
          </p>
          <p
            className="text-xs mb-6"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Verifique também a caixa de spam.
          </p>
          <Link
            href="/login"
            className="tfd-btn tfd-btn-primary inline-flex"
          >
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--tfd-surface-ground)' }}
    >
      <div className="w-full max-w-[400px]">
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
            Recuperar senha
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Informe seu e-mail para receber o link de recuperação
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
              <label className="tfd-label" htmlFor="email-recover">
                E-mail cadastrado
              </label>
              <input
                id="email-recover"
                type="email"
                className="tfd-input"
                placeholder="seu.email@ses.ma.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
                  Enviando...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Enviar link de recuperação
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
