'use client';

/**
 * AZ2 — Botão inline para qualquer setor solicitar autorização da coordenação
 * diretamente da solicitação. O pedido cai na caixa de /autorizacoes.
 */

import { useState } from 'react';
import { ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import {
  criarAutorizacao,
  tipoAutorizacaoLabels,
  type TipoAutorizacao,
} from '@/services/autorizacoes.service';

interface Props {
  solicitacaoId: string;
  autorId?: string;
  autorPerfil?: string;
  onRequested?: () => void;
}

export default function AutorizacaoInline({
  solicitacaoId,
  autorId,
  autorPerfil,
  onRequested,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoAutorizacao>('OUTRO');
  const [justificativa, setJustificativa] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit() {
    if (!autorId || !autorPerfil || !justificativa.trim()) return;
    setSaving(true);
    const result = await criarAutorizacao({
      solicitacaoId,
      tipo,
      justificativa: justificativa.trim(),
      solicitadoPorId: autorId,
      solicitadoPorPerfil: autorPerfil,
    });
    setSaving(false);
    if (result.error) {
      setFeedback('Não foi possível solicitar. Tente novamente.');
      return;
    }
    setFeedback('Solicitação enviada à coordenação.');
    setJustificativa('');
    setTipo('OUTRO');
    setTimeout(() => {
      setOpen(false);
      setFeedback(null);
      onRequested?.();
    }, 1200);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="tfd-btn tfd-btn-outline tfd-btn--sm"
        onClick={() => setOpen(true)}
        disabled={!autorId}
        style={{
          gap: '0.375rem',
          color: 'var(--tfd-status-warning)',
          borderColor: 'var(--tfd-status-warning)',
        }}
      >
        <ShieldAlert size={13} />
        Solicitar autorização da coordenação
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-4 rounded-lg"
      style={{
        backgroundColor: 'var(--tfd-status-warning-bg)',
        border: '1px dashed var(--tfd-status-warning)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={14} style={{ color: 'var(--tfd-status-warning)' }} />
        <h4
          className="text-sm font-semibold"
          style={{ color: 'var(--tfd-text-primary)' }}
        >
          Solicitar autorização da coordenação
        </h4>
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-medium block"
          style={{ color: 'var(--tfd-text-secondary)' }}
        >
          Tipo de exceção
        </label>
        <select
          className="tfd-input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoAutorizacao)}
        >
          {(Object.entries(tipoAutorizacaoLabels) as [TipoAutorizacao, string][]).map(
            ([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ),
          )}
        </select>

        <label
          className="text-xs font-medium block pt-1"
          style={{ color: 'var(--tfd-text-secondary)' }}
        >
          Justificativa
        </label>
        <textarea
          className="tfd-input"
          rows={3}
          placeholder="Descreva o motivo e contexto da exceção…"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />

        {feedback && (
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={12} />
            {feedback}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            onClick={() => {
              setOpen(false);
              setJustificativa('');
              setFeedback(null);
            }}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={handleSubmit}
            disabled={saving || !justificativa.trim() || !autorId}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Enviando…
              </>
            ) : (
              'Enviar à coordenação'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
