'use client';

import { useState } from 'react';
import { SendHorizonal, AlertTriangle, Loader2 } from 'lucide-react';
import type { SetorTFD, StatusSolicitacao, UrgenciaDevolucao } from '@/lib/supabase/database.types';
import { criarDevolucao } from '@/services/devolucoes.service';
import { atualizarStatus } from '@/services/solicitacoes.service';

/* -------------------------------------------------- */
/*  Ordered TFD stages                                 */
/* -------------------------------------------------- */

/** The ordered stages of the TFD flow. Each stage maps to a SetorTFD key and the status the solicitação should assume when returned to that stage. */
const ETAPAS_TFD: { setor: SetorTFD; label: string; statusRetorno: StatusSolicitacao }[] = [
  { setor: 'SOLICITACOES', label: 'Solicitações', statusRetorno: 'NOVO' },
  { setor: 'DIAGNOSTICO_CLINICO', label: 'Diagnóstico Clínico', statusRetorno: 'PENDENTE_DIAGNOSTICO' },
  { setor: 'PARECER_MEDICO', label: 'Parecer Médico', statusRetorno: 'EM_ANALISE' },
  { setor: 'REGULACAO', label: 'Regulação', statusRetorno: 'AGUARDANDO_REGULACAO' },
  { setor: 'AGENDAMENTO', label: 'Agendamento', statusRetorno: 'AGUARDANDO_AGENDAMENTO' },
  { setor: 'PASSAGENS', label: 'Viagens / Passagens', statusRetorno: 'AGUARDANDO_EMISSAO' },
  { setor: 'AJUDA_CUSTO', label: 'Ajuda de Custo', statusRetorno: 'EM_PAGAMENTO' },
  { setor: 'PERMANENCIA', label: 'Permanência', statusRetorno: 'EM_PERMANENCIA' },
  { setor: 'ENCERRAMENTO', label: 'Alta / Encerramento', statusRetorno: 'CONCLUIDO' },
];

/* -------------------------------------------------- */
/*  Props                                              */
/* -------------------------------------------------- */

export interface DevolverModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** Current SetorTFD the item is at (determines which prior stages are available) */
  setorAtual: SetorTFD;
  /** The solicitação ID */
  solicitacaoId: string;
  /** Current status of the solicitação (saved as status_retorno in devolucao record) */
  statusAtual: StatusSolicitacao;
  /** Display label — e.g. "TFD-2026-001234 — João Silva" */
  label: string;
  /** Optional: ID of the user performing the action */
  userId?: string;
  /** Callback after successful devolução */
  onSuccess?: () => void;
  /**
   * When true, also show stages AFTER the current one.
   * Used by REGULACAO to allow direct routing to AJUDA_CUSTO for prorrogação.
   */
  allowForward?: boolean;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function DevolverModal({
  open,
  onClose,
  setorAtual,
  solicitacaoId,
  statusAtual,
  label,
  userId,
  onSuccess,
  allowForward = false,
}: DevolverModalProps) {
  const [selectedSetor, setSelectedSetor] = useState<SetorTFD | ''>('');
  const [motivo, setMotivo] = useState('');
  const [urgencia, setUrgencia] = useState<UrgenciaDevolucao>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Stages the item can be sent to: prior stages (devolver), and if allowForward, also forward stages
  const currentIndex = ETAPAS_TFD.findIndex((e) => e.setor === setorAtual);
  const etapasAnteriores = currentIndex > 0 ? ETAPAS_TFD.slice(0, currentIndex) : [];
  const etapasPosteriores = allowForward && currentIndex >= 0 ? ETAPAS_TFD.slice(currentIndex + 1) : [];
  const etapasDisponiveis = [...etapasAnteriores, ...etapasPosteriores];

  function handleClose() {
    if (submitting) return;
    setSelectedSetor('');
    setMotivo('');
    setUrgencia('NORMAL');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!selectedSetor) {
      setError('Selecione o setor de destino.');
      return;
    }
    if (!motivo.trim()) {
      setError('Informe o motivo da devolução.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const etapaDestino = ETAPAS_TFD.find((e) => e.setor === selectedSetor)!;

      // 1. Create the devolução record
      const { error: devError } = await criarDevolucao({
        solicitacao_id: solicitacaoId,
        setor_origem: setorAtual,
        setor_destino: selectedSetor,
        motivo: motivo.trim(),
        urgencia,
        devolvido_por: userId,
        status_retorno: statusAtual,
      });

      if (devError) {
        setError((devError as { message?: string }).message ?? 'Erro ao criar devolução.');
        setSubmitting(false);
        return;
      }

      // 2. Update the solicitação status to the target stage's status
      const { error: statusError } = await atualizarStatus(solicitacaoId, etapaDestino.statusRetorno);

      if (statusError) {
        setError((statusError as { message?: string }).message ?? 'Devolução criada, mas erro ao atualizar status.');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      handleClose();
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Erro inesperado.');
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="tfd-card p-6 max-w-md w-full mx-4"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <SendHorizonal size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Devolver solicitação
            </h3>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              {label}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4">
          {/* Setor destino */}
          <div>
            <label className="tfd-label">Enviar para *</label>
            <select
              className="tfd-input"
              value={selectedSetor}
              onChange={(e) => { setSelectedSetor(e.target.value as SetorTFD); setError(''); }}
            >
              <option value="">Selecione o setor...</option>
              {allowForward ? (
                <>
                  {etapasAnteriores.length > 0 && (
                    <optgroup label="Devolver (etapas anteriores)">
                      {etapasAnteriores.map((etapa) => (
                        <option key={etapa.setor} value={etapa.setor}>{etapa.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {etapasPosteriores.length > 0 && (
                    <optgroup label="Encaminhar (etapas à frente)">
                      {etapasPosteriores.map((etapa) => (
                        <option key={etapa.setor} value={etapa.setor}>{etapa.label}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                etapasAnteriores.map((etapa) => (
                  <option key={etapa.setor} value={etapa.setor}>{etapa.label}</option>
                ))
              )}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="tfd-label">Motivo da devolução *</label>
            <textarea
              className="tfd-input"
              rows={3}
              placeholder="Descreva o motivo pelo qual esta solicitação está sendo devolvida..."
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setError(''); }}
            />
          </div>

          {/* Urgência */}
          <div>
            <label className="tfd-label">Urgência</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="urgencia"
                  value="NORMAL"
                  checked={urgencia === 'NORMAL'}
                  onChange={() => setUrgencia('NORMAL')}
                  style={{ accentColor: 'var(--tfd-primary-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Normal</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="urgencia"
                  value="URGENTE"
                  checked={urgencia === 'URGENTE'}
                  onChange={() => setUrgencia('URGENTE')}
                  style={{ accentColor: 'var(--tfd-status-error)' }}
                />
                <span className="text-sm" style={{ color: 'var(--tfd-status-error)' }}>Urgente</span>
              </label>
            </div>
          </div>

          {/* Warning */}
          {selectedSetor ? (
            etapasPosteriores.some((e) => e.setor === selectedSetor) ? (
              <div
                className="flex items-start gap-2 p-3 rounded-lg text-xs"
                style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  A solicitação será encaminhada diretamente para o setor selecionado, pulando etapas intermediárias.
                  Use apenas quando o processo já está pronto para essa etapa (ex.: prorrogação direto para Ajuda de Custo).
                </span>
              </div>
            ) : (
              <div
                className="flex items-start gap-2 p-3 rounded-lg text-xs"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  A solicitação será devolvida ao setor selecionado e ficará pendente até que a correção seja realizada.
                </span>
              </div>
            )
          ) : (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                A solicitação será movida para o setor selecionado e ficará pendente até que a correção seja realizada.
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--tfd-status-error)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            className="tfd-btn tfd-btn-secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            className="tfd-btn tfd-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Devolvendo...
              </>
            ) : (
              <>
                <SendHorizonal size={14} />
                Devolver
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
