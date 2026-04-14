'use client';

/**
 * D1 — Campo de observações estruturado por etapa.
 *
 * Renderiza a lista de observações da etapa + formulário inline para registrar
 * nova observação (autor, data e texto). Cada observação registrada é gravada
 * em `log_auditoria` via `observacoes-etapa.service` e automaticamente aparece
 * na linha do tempo (D2).
 */

import { useState } from 'react';
import { MessageSquarePlus, UserCircle2, Loader2 } from 'lucide-react';
import type { EtapaObservacao, ObservacaoEtapa } from '@/services/observacoes-etapa.service';
import { registrarObservacao } from '@/services/observacoes-etapa.service';
import { formatDateTime } from '@/shared/pipes/formatters';

interface Props {
  solicitacaoId: string;
  etapa: EtapaObservacao;
  observacoes: ObservacaoEtapa[];
  autorId?: string;
  autorPerfil?: string;
  autorNome?: string;
  onRegistered?: () => void;
}

export default function ObservacoesEtapa({
  solicitacaoId,
  etapa,
  observacoes,
  autorId,
  autorPerfil,
  autorNome,
  onRegistered,
}: Props) {
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit() {
    if (!texto.trim() || !autorId || !autorPerfil) return;
    setSaving(true);
    try {
      await registrarObservacao({
        solicitacaoId,
        etapa,
        texto: texto.trim(),
        autorId,
        autorPerfil,
      });
      setTexto('');
      setExpanded(false);
      onRegistered?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mt-4 pt-3"
      style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquarePlus size={13} style={{ color: 'var(--tfd-text-muted)' }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          Observações ({observacoes.length})
        </span>
      </div>

      {observacoes.length > 0 && (
        <ul className="space-y-2 mb-3">
          {observacoes.map((obs) => (
            <li
              key={obs.id}
              className="flex gap-2.5 p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--tfd-surface-50)' }}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                style={{
                  backgroundColor: 'var(--tfd-primary-50)',
                  color: 'var(--tfd-primary-700)',
                }}
              >
                <UserCircle2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: 'var(--tfd-text-primary)' }}
                  >
                    {obs.autorNome ?? 'Sistema'}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: 'var(--tfd-text-muted)' }}
                  >
                    {formatDateTime(obs.data)}
                  </span>
                </div>
                <p
                  className="text-sm mt-0.5 whitespace-pre-wrap"
                  style={{ color: 'var(--tfd-text-secondary)' }}
                >
                  {obs.texto}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {expanded ? (
        <div className="space-y-2">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder={`Registrar observação nesta etapa${autorNome ? ` como ${autorNome}` : ''}…`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              onClick={() => {
                setTexto('');
                setExpanded(false);
              }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
              onClick={handleSubmit}
              disabled={saving || !texto.trim() || !autorId}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Registrando…
                </>
              ) : (
                'Registrar observação'
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="tfd-btn tfd-btn-ghost tfd-btn--sm w-full"
          onClick={() => setExpanded(true)}
          disabled={!autorId}
          style={{ justifyContent: 'flex-start', gap: '0.375rem' }}
        >
          <MessageSquarePlus size={13} />
          Adicionar observação
        </button>
      )}
    </div>
  );
}
